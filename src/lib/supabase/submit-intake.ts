/**
 * submit-intake.ts — Client-side intake form submission
 *
 * Calls the /api/intake route handler to save the intake data.
 * Also passes the session token so the API can upgrade the draft
 * from 'draft' to 'submitted' status.
 */

import type { IntakeData } from '@/lib/intake-flow'

export interface IntakeSubmissionResult {
  success: boolean
  submissionId?: string
  patientId?: string
  visitType?: string
  error?: string
}

export async function submitIntake(
  data: IntakeData,
  sessionToken?: string
): Promise<IntakeSubmissionResult> {
  try {
    const response = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, sessionToken }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Submission failed',
      }
    }

    return {
      success: true,
      submissionId: result.submissionId,
      patientId: result.patientId,
      visitType: result.visitType,
    }
  } catch (error) {
    console.error('Intake submission error:', error)
    return {
      success: false,
      error: 'Network error. Please try again.',
    }
  }
}
