/**
 * /api/sync/run — Outbox worker
 *
 * Drains pending ehr_sync_jobs by calling the active EHR adapter.
 * Marks success/failure with retry semantics. Idempotent: each adapter
 * is contractually required to dedupe based on submission_id, so a
 * worker timeout that re-runs the job won't create duplicate Healthie
 * patients.
 *
 * Triggers:
 *   - Vercel Cron (vercel.json schedule) — sends GET with Authorization:
 *     Bearer ${CRON_SECRET}. Vercel-managed env var.
 *   - Manual / external — POST with Authorization: Bearer ${SYNC_WORKER_TOKEN}.
 *     Used for curl-based smoke tests in dev or ad-hoc retries in prod.
 *
 * Both methods route through the same handler. Either env-var token is
 * accepted; both must be set if you want both paths to work.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEHRAdapter, EHRSyncError, BookingConflictError } from '@/lib/ehr'
import { intakeToCanonical, formatClinicalSummary } from '@/lib/ehr/transform'
import { mapToIntakeData } from '@/lib/intake-mapping'
import type { IntakeData } from '@/lib/intake-flow'
import type { CheckoutPayload } from '@/lib/supabase/submit-intake'
import type { CanonicalPatient, CanonicalIntake } from '@/lib/ehr/types'

export const runtime = 'nodejs'
export const maxDuration = 60   // give the worker headroom; Healthie can be slow

const BATCH_SIZE = 10

// Both GET (Vercel cron) and POST (manual / curl) hit the same handler.
export async function GET(req: NextRequest)  { return runWorker(req) }
export async function POST(req: NextRequest) { return runWorker(req) }

async function runWorker(req: NextRequest) {
  // ── auth ──────────────────────────────────────────────────────────────
  // Accept either token. CRON_SECRET is what Vercel cron sends; SYNC_WORKER_TOKEN
  // is for our manual / curl path. Both env vars are optional individually but
  // at least one MUST be configured.
  const cronSecret  = process.env.CRON_SECRET
  const workerToken = process.env.SYNC_WORKER_TOKEN
  if (!cronSecret && !workerToken) {
    return NextResponse.json(
      { error: 'Neither CRON_SECRET nor SYNC_WORKER_TOKEN is configured on the server' },
      { status: 500 },
    )
  }
  const auth = req.headers.get('authorization') ?? ''
  const valid =
    (!!cronSecret  && auth === `Bearer ${cronSecret}`) ||
    (!!workerToken && auth === `Bearer ${workerToken}`)
  if (!valid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const adapter  = getEHRAdapter()

  // ── pre-flight: bail early if vendor is down ──────────────────────────
  const ping = await adapter.ping()
  if (!ping.ok) {
    return NextResponse.json(
      { ok: false, reason: 'adapter_ping_failed', detail: ping.detail },
      { status: 503 },
    )
  }

  // ── pull a batch ──────────────────────────────────────────────────────
  // Pending or failed-but-retryable, scheduled time has elapsed, oldest
  // first. Limit BATCH_SIZE per invocation so a long batch doesn't blow
  // through Vercel's max function duration.
  const { data: jobs, error: pullErr } = await supabase
    .from('ehr_sync_jobs')
    .select('id, patient_id, submission_id, operation, target_provider, attempts, max_attempts, payload')
    .in('status', ['pending', 'failed'])
    .lte('scheduled_for', new Date().toISOString())
    .eq('target_provider', adapter.providerName)
    .order('scheduled_for', { ascending: true })
    .limit(BATCH_SIZE)

  if (pullErr) {
    console.error('[sync] pull failed', pullErr)
    return NextResponse.json({ error: 'pull failed' }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, results: [] })
  }

  const results: Array<{ jobId: string; status: string; detail?: string }> = []

  for (const job of jobs) {
    // Claim the job. With multiple concurrent workers we'd need
    // SELECT FOR UPDATE SKIP LOCKED via .rpc(); single-worker is fine.
    const { error: claimErr } = await supabase
      .from('ehr_sync_jobs')
      .update({
        status:          'in_progress',
        attempts:        job.attempts + 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .in('status', ['pending', 'failed'])

    if (claimErr) {
      results.push({ jobId: job.id, status: 'claim_failed', detail: claimErr.message })
      continue
    }

    try {
      // Hydrate canonical inputs from Supabase rows.
      const ctx = await loadContext(supabase, job.patient_id, job.submission_id)

      // ── Slot-driven path vs random-routing path ──────────────────
      // If the patient picked a real slot at /book-consultation, we
      // already have a chosen provider (the one whose slot they grabbed).
      // Skip random routing entirely and trust the hold.
      //
      // Otherwise, fall back to the original "pick any licensed provider"
      // logic. That path covers async submissions and any in-flight
      // sync intakes that came through before commit 3 deployed.
      const bookedSlot = (ctx.rawResponses as any)?.bookedSlot as
        | {
            holdId:         string
            providerId:     string
            healthieUserId: string
            slotDatetime:   string
            contactType:    'video' | 'phone'
            providerName:   string
            expiresAt:      string
          }
        | undefined

      let chosenProviderId: string
      let chosenHealthieId: string

      if (bookedSlot) {
        chosenProviderId = bookedSlot.providerId
        chosenHealthieId = bookedSlot.healthieUserId
      } else {
        // Language-based routing is deferred until we have a concrete
        // need (Spanish-speaking patient → Spanish-speaking provider).
        // Today we route purely by state licensure.
        const routed = await pickLicensedProvider(
          supabase,
          ctx.patient.state,
          adapter.providerName,
        )
        if (!routed) {
          throw new EHRSyncError({
            message:
              `No licensed provider available for state=${ctx.patient.state}. ` +
              `Onboard a provider in Healthie covering this state, then run ` +
              `/api/admin/sync-providers.`,
            retryable: false,
          })
        }
        chosenProviderId = routed.localProviderId
        chosenHealthieId = routed.healthieUserId
      }

      const summary = formatClinicalSummary(ctx.intakeData, ctx.patient, ctx.intake)

      // Run the adapter.
      const out = await adapter.createPatientWithIntake({
        patient:             ctx.patient,
        intake:              ctx.intake,
        idempotencyKey:      job.submission_id,
        patientCanonicalId:  job.patient_id,
        clinicalSummaryText: summary,
        rawIntakePayload:    ctx.rawResponses,
        address:             (job.payload as any)?.address ?? undefined,
        dietitianExternalId: chosenHealthieId,
      })

      // Persist external IDs. Upsert handles retry-after-partial-success.
      const idRows = [
        {
          patient_id:    job.patient_id,
          provider:      adapter.providerName,
          resource_type: 'client',
          external_id:   out.externalPatientId,
          metadata:      {},
        },
        ...(out.additionalIds ?? []).map((extra) => ({
          patient_id:    job.patient_id,
          provider:      adapter.providerName,
          resource_type: extra.resourceType,
          external_id:   extra.externalId,
          metadata:      extra.metadata ?? {},
        })),
      ]
      const { error: idsErr } = await supabase
        .from('ehr_external_ids')
        .upsert(idRows, { onConflict: 'patient_id,provider,resource_type,external_id' })
      if (idsErr) throw idsErr

      // ── Determine visit type ─────────────────────────────────────
      // bookedSlot implies sync (only sync flow goes through /book-consultation).
      // Otherwise look at the legacy `format` field that the old picker set,
      // which covers in-flight intakes from before commit 3.
      const visitType: 'sync' | 'async' = bookedSlot
        ? 'sync'
        : (ctx.rawResponses as any)?.format ? 'sync' : 'async'

      // ── Always insert provider_assignment row ────────────────────
      // The assignment is the canonical "this patient is this provider's
      // responsibility" record. Created for every intake, sync or async.
      // Reassignments later create new rows linked via transferred_to_*.
      const { data: assignment, error: assignErr } = await supabase
        .from('provider_assignments')
        .insert({
          patient_id:  job.patient_id,
          provider_id: chosenProviderId,
          intake_id:   job.submission_id,
          visit_type:  visitType,
          status:      'active',
          ehr_provider:    adapter.providerName,
          ehr_external_id: null,                // Healthie has no assignment entity
        })
        .select('id')
        .single()
      if (assignErr || !assignment) {
        // Patient was created in Healthie successfully but we couldn't
        // record the assignment locally. Mark retryable so the worker
        // tries again — adapter idempotency prevents double-creation.
        throw new EHRSyncError({
          message: `Failed to insert provider_assignment: ${assignErr?.message ?? 'no row returned'}`,
          retryable: true,
        })
      }

      // ── Sync visits: insert appointments row + clean up the hold ─
      // Two paths:
      //   (A) bookedSlot present — patient went through /book-consultation
      //       picker. We attempt Healthie's createAppointment first, then
      //       INSERT the appointments row with the authoritative result
      //       (status='scheduled' + Healthie appointment id). If Healthie
      //       rejects the booking, we still INSERT with status='requested'
      //       + a clear ops note so the appointment surfaces in dashboards.
      //       Either way the provisional hold is deleted.
      //   (B) Legacy sync without picker (in-flight pre-commit-3) — fall
      //       back to parseSlotPreference and the verbose ops note.
      if (bookedSlot) {
        // Attempt to book the held slot in Healthie's calendar. The
        // adapter sets enforce_availability=true, so a slot taken in
        // Healthie between hold and book throws BookingConflictError.
        let appointmentExtId:   string | null = null
        let scheduledDatetime:  string        = bookedSlot.slotDatetime
        let videoRoomUrl:       string | null = null
        let appointmentStatus:  'scheduled' | 'requested' = 'requested'
        let bookingNote =
          `Patient picked ${bookedSlot.contactType} consult with ${bookedSlot.providerName} ` +
          `at ${bookedSlot.slotDatetime} via /book-consultation slot picker.`

        try {
          const apptResult = await adapter.scheduleAppointment({
            patientExternalId: out.externalPatientId,
            slot: {
              providerExternalId: bookedSlot.healthieUserId,
              datetime:           bookedSlot.slotDatetime,
              durationMinutes:    20,
              contactType:        bookedSlot.contactType,
            },
          })
          appointmentExtId  = apptResult.externalAppointmentId
          scheduledDatetime = apptResult.bookedDatetime || bookedSlot.slotDatetime
          videoRoomUrl      = apptResult.joinUrl ?? null
          appointmentStatus = 'scheduled'
          bookingNote += ` Auto-booked in Healthie (appt ${apptResult.externalAppointmentId}).`
        } catch (err: any) {
          if (err instanceof BookingConflictError) {
            bookingNote +=
              ` SLOT CONFLICT at booking time: ${err.message}. ` +
              `Ops to find an alternate slot and confirm with patient.`
            console.error(`[sync] booking conflict for assignment ${assignment.id}:`, err)
          } else {
            bookingNote +=
              ` Healthie createAppointment failed: ${err?.message ?? 'unknown'}. ` +
              `Ops to retry booking manually in Healthie.`
            console.error(`[sync] scheduleAppointment failed for assignment ${assignment.id}:`, err)
          }
          // Non-fatal — the patient + assignment are already real, ops
          // can manually finish the booking. The appointments row still
          // gets inserted (with status='requested') so dashboards see it.
        }

        const { error: apptErr } = await supabase
          .from('appointments')
          .insert({
            patient_id:    job.patient_id,
            provider_id:   bookedSlot.providerId,
            assignment_id: assignment.id,
            type:          'sync',
            status:        appointmentStatus,
            scheduled_at:  scheduledDatetime,
            duration_min:  20,
            intake_id:     job.submission_id,
            provider_notes: bookingNote,
            ehr_provider:    adapter.providerName,
            ehr_external_id: appointmentExtId,
            video_room_url:  videoRoomUrl,
          })
        if (apptErr) {
          console.error(`[sync] appointments insert (slot-driven) failed for assignment ${assignment.id}:`, apptErr)
        }

        // Clean up the soft-hold regardless of Healthie booking outcome.
        // Best-effort: even if this fails, the periodic cleanup-holds
        // cron will sweep it within 10 min.
        const { error: holdErr } = await supabase
          .from('provisional_appointments')
          .delete()
          .eq('id', bookedSlot.holdId)
        if (holdErr) {
          console.error(`[sync] hold cleanup failed for ${bookedSlot.holdId}:`, holdErr)
        }
      } else if (visitType === 'sync') {
        // Legacy path: free-text date+time from the old mock picker.
        const requestedAt    = parseSlotPreference(ctx.rawResponses)
        const slotPreferenceNote = buildSlotPreferenceNote(ctx.rawResponses)
        const { error: apptErr } = await supabase
          .from('appointments')
          .insert({
            patient_id:    job.patient_id,
            provider_id:   chosenProviderId,
            assignment_id: assignment.id,
            type:          'sync',
            status:        'requested',
            scheduled_at:  requestedAt,
            duration_min:  20,
            intake_id:     job.submission_id,
            provider_notes: slotPreferenceNote,
            ehr_provider:   null,
            ehr_external_id: null,
          })
        if (apptErr) {
          console.error(`[sync] appointments insert (legacy path) failed for assignment ${assignment.id}:`, apptErr)
        }
      }

      // Mark job complete.
      await supabase
        .from('ehr_sync_jobs')
        .update({
          status:       'completed',
          completed_at: new Date().toISOString(),
          last_error:   null,
        })
        .eq('id', job.id)

      results.push({ jobId: job.id, status: 'completed' })

    } catch (err: any) {
      const isEHR     = err instanceof EHRSyncError
      const retryable = isEHR ? err.retryable : true
      const newAttempts = job.attempts + 1
      const exhausted   = newAttempts >= job.max_attempts

      // Exponential backoff: 30s, 2m, 8m, 30m, 2h.
      const backoffSec  = Math.min(30 * 4 ** newAttempts, 7200)
      const nextRun     = new Date(Date.now() + backoffSec * 1000).toISOString()

      const finalStatus = (!retryable || exhausted) ? 'failed' : 'pending'

      await supabase
        .from('ehr_sync_jobs')
        .update({
          status:        finalStatus,
          last_error:    err?.message ?? String(err),
          scheduled_for: nextRun,
        })
        .eq('id', job.id)

      results.push({
        jobId: job.id,
        status: finalStatus,
        detail: `attempt ${newAttempts}/${job.max_attempts}: ${err?.message ?? 'unknown'}`,
      })
    }
  }

  return NextResponse.json({ ok: true, processed: jobs.length, results })
}

// ─── Hydrators ───────────────────────────────────────────────────────────

interface JobContext {
  patient:      CanonicalPatient
  intake:       CanonicalIntake
  intakeData:   IntakeData
  rawResponses: unknown
}

async function loadContext(
  supabase:     ReturnType<typeof createAdminClient>,
  patientId:    string,
  submissionId: string | null,
): Promise<JobContext> {
  const [{ data: p, error: pErr }, { data: s, error: sErr }] = await Promise.all([
    supabase.from('patients').select('*').eq('id', patientId).single(),
    submissionId
      ? supabase.from('intake_submissions').select('*').eq('id', submissionId).single()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (pErr || !p)                            throw new Error(`patient ${patientId} not found`)
  if (submissionId && (sErr || !s))          throw new Error(`submission ${submissionId} not found`)

  // intake_submissions.responses holds the IntakeData payload plus the
  // checkout block that /api/intake appended. We apply the form→canonical
  // mapping here as a defense for old submissions written before the
  // client-side mapping was added — idempotent on already-mapped data.
  const rawResponses: any = s?.responses ?? {}
  const checkout: CheckoutPayload | undefined = rawResponses.checkout

  // Strip the checkout block before mapping; checkout fields aren't part
  // of IntakeData and shouldn't go through the form-shape translator.
  const { checkout: _drop, ...rawIntake } = rawResponses
  const mapped = mapToIntakeData(rawIntake)
  const intakeData = mapped as IntakeData

  // Patient table holds the latest demographics. checkout.email is the
  // real email that triggered the sync; falling back to patients.email
  // covers cases where the worker re-runs after manual repair.
  const email = checkout?.email ?? p.email

  const { patient, intake, errors } = intakeToCanonical(
    intakeData as IntakeData,
    {
      email,
      submittedAt: s?.submitted_at ?? new Date().toISOString(),
    },
  )

  if (errors.length) {
    throw new EHRSyncError({
      message: `Canonical transform errors: ${errors.join('; ')}`,
      retryable: false,
    })
  }

  return {
    patient,
    intake,
    intakeData,
    rawResponses,
  }
}

// ─── Provider routing ───────────────────────────────────────────────────

/**
 * Find a provider licensed in the given state. Random-pick from the
 * eligible pool. Returns null if no eligible provider exists (caller
 * should fail the job non-retryably so ops can onboard a covering
 * provider).
 *
 * Pool criteria:
 *   - is_active = true
 *   - accepts_new = true
 *   - archived_at IS NULL
 *   - patient state ∈ provider.license_states
 *   - has a provider_external_ids row for the active vendor
 *
 * Language-based filtering is deferred — async flow doesn't capture a
 * language preference, so adding language to this query would
 * over-restrict. Revisit when we have multi-language routing as a
 * concrete requirement.
 */
async function pickLicensedProvider(
  supabase: ReturnType<typeof createAdminClient>,
  patientState: string,
  vendor: string,
): Promise<{ localProviderId: string; healthieUserId: string } | null> {
  const { data, error } = await supabase
    .from('providers')
    .select('id, provider_external_ids!inner(external_id, vendor)')
    .is('archived_at', null)
    .eq('is_active', true)
    .eq('accepts_new', true)
    .contains('license_states', [patientState])
    .eq('provider_external_ids.vendor', vendor)

  if (error) {
    console.error('[sync] provider routing query failed', error)
    return null
  }
  if (!data || data.length === 0) return null

  // Random pick. With 2 providers in sandbox this gives ~50/50; with N
  // providers, ~uniform. Replace with least-loaded if/when we want to
  // balance by current caseload.
  const chosen = data[Math.floor(Math.random() * data.length)] as any
  const externalIds = chosen.provider_external_ids as Array<{ external_id: string; vendor: string }>
  const mapping = externalIds.find((m) => m.vendor === vendor)
  if (!mapping) return null

  return {
    localProviderId: chosen.id,
    healthieUserId:  mapping.external_id,
  }
}

/**
 * Build a short note explaining the patient's stated slot preference,
 * to populate appointments.provider_notes for sync visits. Ops uses this
 * to manually book the calendar slot in Healthie until /book-consultation
 * pulls real availability and we can auto-book.
 */
function buildSlotPreferenceNote(responses: any): string {
  const format   = responses?.format ?? '(no format chosen)'
  const date     = responses?.date   ?? '(no date chosen)'
  const time     = responses?.time   ?? '(no time chosen)'
  const language = responses?.language ?? 'English'
  return `Patient requested ${format} consult on ${date} at ${time} (${language}). ` +
         `Auto-booking deferred to next release; please book this slot in Healthie's calendar.`
}

/**
 * Naively combine the patient's chosen date + time strings into an ISO
 * timestamp. Server-local timezone interpretation by design — commit 3
 * replaces this with Healthie's authoritative confirmed time, so any
 * tz drift here is corrected before the patient sees calendar UI.
 *
 * Returns null if either piece is missing or the combined string can't
 * be parsed; the appointments row falls back to scheduled_at = NULL,
 * which is fine because status='requested' already signals "tentative."
 */
function parseSlotPreference(responses: any): string | null {
  const date = responses?.date
  const time = responses?.time
  if (!date || !time) return null
  const dt = new Date(`${date} ${time}`)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}
