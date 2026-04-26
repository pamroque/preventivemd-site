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
import { getEHRAdapter, EHRSyncError } from '@/lib/ehr'
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
