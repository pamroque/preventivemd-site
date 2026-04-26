/**
 * POST /api/intake — Final intake form submission (called from /checkout)
 *
 * Server-side handler that finalizes a patient's intake. Uses the admin
 * client (service role) because the patient may not have a Supabase auth
 * account yet.
 *
 * Body shape:
 *   {
 *     data:         IntakeData (flattened from sessionStorage steps),
 *     checkout:     { email, street, apt?, city, zip, paymentMethod },
 *     sessionToken: string  (existing draft token, used to upgrade draft → submitted)
 *   }
 *
 * Flow:
 *   1. Validate required fields
 *   2. Find or create the patient row, using checkout email if provided
 *      (replaces the placeholder "<phone>@intake.preventivemd.com" if it
 *      already exists)
 *   3. Upgrade the existing draft submission to status='submitted', or
 *      insert a new row if no draft was tracked
 *   4. Persist treatment selections
 *   5. If we have real email AND EHR_PROVIDER is set, enqueue an
 *      ehr_sync_jobs outbox row. The /api/sync/run worker drains it.
 *   6. Return immediately with submissionId
 *
 * Note: patient creation in Healthie does NOT happen synchronously here.
 * Even if the EHR is down at submit time, the patient still completes the
 * UX flow and the outbox retries the sync later.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateBMI, SYNC_REQUIRED_STATES } from '@/lib/intake-flow'
import type { IntakeData } from '@/lib/intake-flow'
import type { CheckoutPayload } from '@/lib/supabase/submit-intake'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const intakeData:   IntakeData       = body.data
    const checkout:     CheckoutPayload | undefined = body.checkout
    const sessionToken: string | undefined          = body.sessionToken

    // ── Basic validation ──────────────────────────────────
    if (!intakeData?.firstName || !intakeData?.lastName || !intakeData?.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, phone' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // ── Find or create patient ────────────────────────────
    // The draft endpoint (/api/intake/draft) already created a patient
    // row earlier in the flow, keyed by phone. We look that one up here
    // and update it with the real email + address from checkout.
    let patientId: string

    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id, email')
      .eq('phone', intakeData.phone)
      .maybeSingle()

    const realEmail = checkout?.email?.trim().toLowerCase()
    // Fallback: if no checkout email arrived, keep the placeholder so the
    // patient row stays valid. EHR sync will be skipped in that branch.
    const patientEmail = realEmail || `${intakeData.phone}@intake.preventivemd.com`

    if (existingPatient) {
      patientId = existingPatient.id

      await supabase
        .from('patients')
        .update({
          first_name:    intakeData.firstName,
          last_name:     intakeData.lastName,
          email:         patientEmail,
          date_of_birth: intakeData.dob || null,
          sex:           intakeData.sex || null,
          state:         intakeData.state || null,
          sms_opt_in:    intakeData.smsOptIn,
        })
        .eq('id', patientId)
    } else {
      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          first_name:    intakeData.firstName,
          last_name:     intakeData.lastName,
          email:         patientEmail,
          phone:         intakeData.phone,
          date_of_birth: intakeData.dob || null,
          sex:           intakeData.sex || null,
          state:         intakeData.state || null,
          sms_opt_in:    intakeData.smsOptIn,
        })
        .select('id')
        .single()

      if (patientError || !newPatient) {
        console.error('Failed to create patient:', patientError)
        return NextResponse.json(
          { error: 'Failed to create patient record' },
          { status: 500 }
        )
      }

      patientId = newPatient.id
    }

    // ── Compute extracted fields ──────────────────────────
    const bmi = calculateBMI(intakeData.heightFeet, intakeData.heightInches, intakeData.weight)
    const visitType = SYNC_REQUIRED_STATES.includes(intakeData.state) ? 'sync' : 'async'

    // ── Upgrade existing draft, or insert a fresh submission ──
    // The /api/intake/draft handler stores progress as status='draft' keyed
    // by sessionToken. At submission time we want exactly one row to flip
    // to status='submitted' carrying the final responses.
    let submissionId: string

    if (sessionToken) {
      const { data: existingDraft } = await supabase
        .from('intake_submissions')
        .select('id')
        .eq('session_token', sessionToken)
        .eq('status', 'draft')
        .maybeSingle()

      if (existingDraft) {
        const { data: upgraded, error: upgradeErr } = await supabase
          .from('intake_submissions')
          .update({
            status:         'submitted',
            patient_id:     patientId,
            responses:      { ...intakeData, checkout },     // append checkout payload
            bmi:            bmi ? Math.round(bmi * 100) / 100 : null,
            visit_type:     visitType,
            patient_state:  intakeData.state,
            submitted_at:   new Date().toISOString(),
          })
          .eq('id', existingDraft.id)
          .select('id')
          .single()

        if (upgradeErr || !upgraded) {
          console.error('Failed to upgrade draft submission:', upgradeErr)
          return NextResponse.json(
            { error: 'Failed to save intake submission' },
            { status: 500 }
          )
        }
        submissionId = upgraded.id
      } else {
        // No draft existed — this is unusual but possible if sessionStorage
        // was cleared mid-flow. Insert a fresh submitted row.
        submissionId = await insertNewSubmission(supabase, patientId, intakeData, checkout, bmi, visitType)
      }
    } else {
      submissionId = await insertNewSubmission(supabase, patientId, intakeData, checkout, bmi, visitType)
    }

    // ── Persist treatment selections ──────────────────────
    if (intakeData.desiredTreatments?.length) {
      const { data: treatments } = await supabase
        .from('treatments')
        .select('id, slug')
        .in('slug', intakeData.desiredTreatments)

      if (treatments && treatments.length > 0) {
        const treatmentInserts = treatments.map((t: { id: string }) => ({
          patient_id:   patientId,
          treatment_id: t.id,
          status:       'requested',
        }))

        await supabase
          .from('patient_treatments')
          .upsert(treatmentInserts, {
            onConflict:        'patient_id,treatment_id',
            ignoreDuplicates:  true,
          })
      }
    }

    // ── Initial support conversation (existing behavior) ──
    // Idempotent-ish: if a conversation already exists for this patient,
    // we do nothing. RLS service role bypasses this so the insert is direct.
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('patient_id', patientId)
      .eq('type', 'support')
      .maybeSingle()
    if (!existingConv) {
      await supabase
        .from('conversations')
        .insert({
          patient_id: patientId,
          type:       'support',
          subject:    'Welcome to PreventiveMD',
          status:     'open',
        })
    }

    // ── Enqueue EHR sync job (only when we have a real email) ──
    // Without a real email Healthie's createClient won't accept the patient.
    // EHR_PROVIDER may be unset on local dev — in that case skip silently
    // and the patient is created in Supabase only. Worker won't pick up
    // anything because no row was inserted.
    const ehrProvider = process.env.EHR_PROVIDER?.toLowerCase()
    const shouldEnqueue = !!realEmail && !!ehrProvider && ehrProvider !== 'none'

    if (shouldEnqueue) {
      const { error: jobErr } = await supabase
        .from('ehr_sync_jobs')
        .insert({
          patient_id:      patientId,
          submission_id:   submissionId,
          operation:       'create_patient_with_intake',
          target_provider: ehrProvider,
          status:          'pending',
          payload: {
            // The worker uses these to populate Healthie's location field.
            // Address fields don't live on the patients table today; we
            // attach them to the job so they survive the queue cleanly.
            address: {
              line1: checkout!.street,
              line2: checkout!.apt || undefined,
              city:  checkout!.city,
              state: intakeData.state,
              zip:   checkout!.zip,
            },
          },
        })

      if (jobErr) {
        // Patient + submission already persisted, which is the important
        // thing. The outbox can be backfilled by ops later if this fails.
        console.error('[intake] outbox insert failed (will need manual backfill)', jobErr)
      }
    }

    // ── Return immediately ────────────────────────────────
    return NextResponse.json({
      success:      true,
      submissionId,
      patientId,
      visitType,
      ehrQueued:    shouldEnqueue,
    })

  } catch (error) {
    console.error('Intake submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function insertNewSubmission(
  supabase:   ReturnType<typeof createAdminClient>,
  patientId:  string,
  intakeData: IntakeData,
  checkout:   CheckoutPayload | undefined,
  bmi:        number | null,
  visitType:  'sync' | 'async',
): Promise<string> {
  const { data, error } = await supabase
    .from('intake_submissions')
    .insert({
      patient_id:    patientId,
      form_version:  '1.0',
      status:        'submitted',
      responses:     { ...intakeData, checkout },
      bmi:           bmi ? Math.round(bmi * 100) / 100 : null,
      visit_type:    visitType,
      patient_state: intakeData.state,
      submitted_at:  new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to insert intake submission: ${error?.message}`)
  }
  return data.id
}
