/**
 * intake-session.ts — Client-side session management for intake form
 *
 * Uses a cookie to track anonymous sessions so returning users
 * can resume their intake form where they left off.
 *
 * Flow:
 *   1. First visit: generate a session token, store in cookie
 *   2. On each step advance: auto-save draft to Supabase via API
 *   3. On return visit: read cookie → load draft → prefill form
 *   4. On final submit: mark as 'submitted', clear cookie
 */

const COOKIE_NAME = 'pmd_intake_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/** Generate a random session token */
function generateToken(): string {
  return crypto.randomUUID()
}

/** Get the session token from the cookie, or create a new one */
export function getSessionToken(): string {
  // Check for existing cookie
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  if (match) return match[1]

  // Create new token and set cookie
  const token = generateToken()
  setSessionCookie(token)
  return token
}

/** Set the session cookie */
function setSessionCookie(token: string) {
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

/** Clear the session cookie (after successful submission) */
export function clearSessionToken() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
}

/** Save draft to the API */
export async function saveDraft(
  sessionToken: string,
  data: Record<string, unknown>,
  currentStep: string,
  visitedSteps: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/intake/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken,
        data,
        currentStep,
        visitedSteps,
      }),
    })

    const result = await response.json()
    return { success: response.ok, error: result.error }
  } catch {
    // Silent fail on draft saves — don't block the user
    return { success: false, error: 'Network error' }
  }
}

/** Load an existing draft from the API */
export async function loadDraft(
  sessionToken: string
): Promise<{
  found: boolean
  data?: Record<string, unknown>
  currentStep?: string
  visitedSteps?: string[]
} | null> {
  try {
    const response = await fetch(`/api/intake/draft?token=${encodeURIComponent(sessionToken)}`)

    if (!response.ok) return { found: false }

    const result = await response.json()
    return result
  } catch {
    return { found: false }
  }
}
