/**
 * POST /api/intake — Submit intake form data
 *
 * This is the server-side handler for intake form submissions.
 * It uses the admin client (service role) because at this point
 * the patient may not have a Supabase auth account yet.
 *
 * Flow:
 *   1. Validate the incoming data
 *   2. Find or create the patient record (by email or phone)
 *   3. Store the full intake response as JSONB
 *   4. Extract indexed fields (BMI, visit_type, state)
 *   5. Return the submission ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateBMI, SYNC_REQUIRED_STATES } from '@/lib/intake-flow'
import type { IntakeData } from '@/lib/intake-flow'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const intakeData: IntakeData = body.data
    const sessionToken: string | undefined = body.sessionToken

    // ── Basic validation ──────────────────────────────────
    if (!intakeData.firstName || !intakeData.lastName || !intakeData.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, phone' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // ── Find or create patient ────────────────────────────
    let patientId: string

    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('phone', intakeData.phone)
      .maybeSingle()

    if (existingPatient) {
      patientId = existingPatient.id

      await supabase
        .from('patients')
        .update({
          first_name: intakeData.firstName,
          last_name: intakeData.lastName,
          date_of_birth: intakeData.dob || null,
          sex: intakeData.sex || null,
          state: intakeData.state || null,
          sms_opt_in: intakeData.smsOptIn,
        })
        .eq('id', patientId)
    } else {
      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          first_name: intakeData.firstName,
          last_name: intakeData.lastName,
          email: `${intakeData.phone}@intake.preventivemd.com`,
          phone: intakeData.phone,
          date_of_birth: intakeData.dob || null,
          sex: intakeData.sex || null,
          state: intakeData.state || null,
          sms_opt_in: intakeData.smsOptIn,
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

    // ── Create intake submission ──────────────────────────
    const { data: submission, error: intakeError } = await supabase
      .from('intake_submissions')
      .insert({
        patient_id: patientId,
        form_version: '1.0',
        status: 'submitted',
        responses: intakeData,
        bmi: bmi ? Math.round(bmi * 100) / 100 : null,
        visit_type: visitType,
        patient_state: intakeData.state,
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (intakeError || !submission) {
      console.error('Failed to create intake submission:', intakeError)
      return NextResponse.json(
        { error: 'Failed to save intake submission' },
        { status: 500 }
      )
    }

    // ── Store desired treatments ──────────────────────────
    if (intakeData.desiredTreatments.length > 0) {
      const { data: treatments } = await supabase
        .from('treatments')
        .select('id, slug')
        .in('slug', intakeData.desiredTreatments)

      if (treatments && treatments.length > 0) {
        const treatmentInserts = treatments.map((t: { id: string }) => ({
          patient_id: patientId,
          treatment_id: t.id,
          status: 'requested',
        }))

        await supabase
          .from('patient_treatments')
          .upsert(treatmentInserts, {
            onConflict: 'patient_id,treatment_id',
            ignoreDuplicates: true,
          })
      }
    }

    // ── Upgrade draft to submitted (if session token exists) ──
    if (sessionToken) {
      await supabase
        .from('intake_submissions')
        .update({ status: 'archived' })
        .eq('session_token', sessionToken)
        .eq('status', 'draft')
    }

    // ── Create initial support conversation ───────────────
    await supabase
      .from('conversations')
      .insert({
        patient_id: patientId,
        type: 'support',
        subject: 'Welcome to PreventiveMD',
        status: 'open',
      })

    // ── Return success ────────────────────────────────────
    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      patientId,
      visitType,
    })

  } catch (error) {
    console.error('Intake submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
