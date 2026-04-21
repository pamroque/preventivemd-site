/**
 * /api/intake/draft — Save and load intake form drafts
 *
 * POST: Save/update a draft (called on each step advance)
 * GET:  Load an existing draft by session token (called on page load)
 *
 * Uses session_token (stored in a cookie) to identify anonymous users.
 * No auth required — drafts are linked by token, not by user account.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── POST: Save or update a draft ────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionToken, data, currentStep, visitedSteps } = body

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Missing session token' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if a draft already exists for this session
    const { data: existing } = await supabase
      .from('intake_submissions')
      .select('id, patient_id')
      .eq('session_token', sessionToken)
      .eq('status', 'draft')
      .maybeSingle()

    if (existing) {
      // Update the existing draft
      await supabase
        .from('intake_submissions')
        .update({
          responses: data,
          current_step: currentStep,
          visited_steps: visitedSteps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      // If we have personal info, update the patient record too
      if (data.firstName && data.phone && existing.patient_id) {
        await supabase
          .from('patients')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            date_of_birth: data.dob || null,
            sex: data.sex || null,
            state: data.state || null,
            sms_opt_in: data.smsOptIn || false,
          })
          .eq('id', existing.patient_id)
      }

      return NextResponse.json({ success: true, action: 'updated' })
    } else {
      // Create a new draft
      // If we have enough personal info, create a patient record
      let patientId: string | null = null

      if (data.firstName && data.lastName && data.phone) {
        // Check if patient already exists by phone
        const { data: existingPatient } = await supabase
          .from('patients')
          .select('id')
          .eq('phone', data.phone)
          .maybeSingle()

        if (existingPatient) {
          patientId = existingPatient.id
        } else {
          const { data: newPatient } = await supabase
            .from('patients')
            .insert({
              first_name: data.firstName,
              last_name: data.lastName,
              email: `${data.phone}@intake.preventivemd.com`,
              phone: data.phone,
              date_of_birth: data.dob || null,
              sex: data.sex || null,
              state: data.state || null,
              sms_opt_in: data.smsOptIn || false,
            })
            .select('id')
            .single()

          if (newPatient) patientId = newPatient.id
        }
      }

      if (!patientId) {
        // Create a placeholder patient for the draft
        // (will be updated when personal info step is completed)
        const { data: placeholder } = await supabase
          .from('patients')
          .insert({
            first_name: 'Draft',
            last_name: 'User',
            email: `${sessionToken}@draft.preventivemd.com`,
            phone: null,
          })
          .select('id')
          .single()

        if (placeholder) patientId = placeholder.id
      }

      if (!patientId) {
        return NextResponse.json(
          { error: 'Failed to create draft' },
          { status: 500 }
        )
      }

      await supabase
        .from('intake_submissions')
        .insert({
          patient_id: patientId,
          session_token: sessionToken,
          form_version: '1.0',
          status: 'draft',
          responses: data,
          current_step: currentStep,
          visited_steps: visitedSteps,
        })

      return NextResponse.json({ success: true, action: 'created' })
    }
  } catch (error) {
    console.error('Draft save error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── GET: Load an existing draft ─────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ found: false })
    }

    const supabase = createAdminClient()

    const { data: draft } = await supabase
      .from('intake_submissions')
      .select('responses, current_step, visited_steps')
      .eq('session_token', token)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!draft) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      data: draft.responses,
      currentStep: draft.current_step,
      visitedSteps: draft.visited_steps,
    })
  } catch (error) {
    console.error('Draft load error:', error)
    return NextResponse.json({ found: false })
  }
}
