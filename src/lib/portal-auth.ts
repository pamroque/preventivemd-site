/**
 * Mock Care-Portal authentication. The real flow will hit Supabase (or
 * whatever auth provider we land on) and verify the patient's identifier
 * + DOB + last name + OTP against the account record. For now we keep
 * everything in-memory so the UI can be developed and tested end-to-end.
 *
 * Swap this file out (or replace its function bodies) when the database
 * layer is ready — call sites only know the exported helpers.
 */

export type Channel = 'email' | 'sms'

export interface VerifyPayload {
  identifier: string
  channel: Channel
  dob: string        // 'MM/DD/YYYY'
  lastName: string
  otp: string        // 6 digits
}

const MOCK_ACCOUNT = {
  email: 'test@preventivemd.com',
  phone: '5551234567',     // 10 digits, no formatting
  dob: '01/01/1990',
  lastName: 'Test',
  otp: '123456',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_DIGITS_RE = /^\d{10}$/

/** Returns the channel inferred from a free-form identifier, or null if neither. */
export function inferChannel(identifier: string): Channel | null {
  const trimmed = identifier.trim()
  if (EMAIL_RE.test(trimmed)) return 'email'
  if (PHONE_DIGITS_RE.test(trimmed.replace(/\D/g, ''))) return 'sms'
  return null
}

/** Normalize a phone identifier to bare 10 digits (for storage + comparison). */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '')
}

/** Pretty-print a 10-digit phone as `(987) 654-3210` for the OTP heading. */
export function formatPhoneDisplay(digits: string): string {
  const d = normalizePhone(digits)
  if (d.length !== 10) return digits
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/** Format a stored identifier for the verify-step heading copy. */
export function formatIdentifierForHeading(identifier: string, channel: Channel): string {
  return channel === 'sms' ? formatPhoneDisplay(identifier) : identifier
}

/**
 * Mock verification. In production this maps to a server-side check that the
 * provided fields match the account that owns the identifier + OTP.
 */
export function verifyCredentials(payload: VerifyPayload): boolean {
  const idMatches =
    (payload.channel === 'email' && payload.identifier.trim().toLowerCase() === MOCK_ACCOUNT.email) ||
    (payload.channel === 'sms' && normalizePhone(payload.identifier) === MOCK_ACCOUNT.phone)

  return (
    idMatches &&
    payload.dob.trim() === MOCK_ACCOUNT.dob &&
    payload.lastName.trim().toLowerCase() === MOCK_ACCOUNT.lastName.toLowerCase() &&
    payload.otp.trim() === MOCK_ACCOUNT.otp
  )
}
