/**
 * submit-intake.ts — Client-side intake form submission
 *
 * Called by the /checkout page when the patient submits the final form.
 * Posts both the accumulated IntakeData (from sessionStorage steps) and
 * the checkout-only fields (email + delivery address) to /api/intake.
 *
 * The server-side route persists the patient + submission, optionally
 * enqueues an EHR sync job, and returns the new submission ID.
 */

import type { IntakeData } from '@/lib/intake-flow'

/** Captured at /checkout — not present in sessionStorage until then. */
export interface CheckoutPayload {
  email:          string
  street:         string
  apt?:           string
  city:           string
  /** US state for delivery; should match IntakeData.state. Server uses
   *  IntakeData.state as the source of truth for licensure routing. */
  zip:            string
  paymentMethod:  'card' | 'pay'
}

/**
 * Booked slot — captured at /book-consultation when a sync-visit patient
 * picks a real Healthie slot and the system soft-holds it. Carried through
 * to /api/intake so the worker can promote the hold into a permanent
 * appointments row instead of writing one with the old free-text date+time.
 *
 * All fields are strings so this can round-trip through sessionStorage
 * (which only stores string|boolean values).
 */
export interface BookedSlot {
  holdId:         string  // provisional_appointments.id
  providerId:     string  // Supabase providers.id
  healthieUserId: string  // vendor external id
  slotDatetime:   string  // ISO-8601
  contactType:    'video' | 'phone'
  providerName:   string
  expiresAt:      string  // ISO-8601 — used by /checkout countdown
}

export interface IntakeSubmissionResult {
  success:       boolean
  submissionId?: string
  patientId?:    string
  visitType?:    string
  error?:        string
}

export async function submitIntake(
  data:         IntakeData,
  checkout:     CheckoutPayload | undefined,
  sessionToken: string | undefined,
  bookedSlot?:  BookedSlot,
): Promise<IntakeSubmissionResult> {
  try {
    const response = await fetch('/api/intake', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ data, checkout, sessionToken, bookedSlot }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error:   result.error || 'Submission failed',
      }
    }

    return {
      success:      true,
      submissionId: result.submissionId,
      patientId:    result.patientId,
      visitType:    result.visitType,
    }
  } catch (error) {
    console.error('Intake submission error:', error)
    return {
      success: false,
      error:   'Network error. Please try again.',
    }
  }
}
