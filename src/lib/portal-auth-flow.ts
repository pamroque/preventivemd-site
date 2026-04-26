/**
 * Tab-scoped state passed between sign-in step 1 (identifier entry) and
 * step 2 (DOB + last name + OTP). The verify page reads `identifier` and
 * `channel` to render the heading copy and verify against the right field.
 *
 * Cleared on successful sign-in or when the user explicitly resets.
 * sessionStorage so closing the tab discards the in-flight state.
 */

import type { Channel } from './portal-auth'

const STORAGE_KEY = 'pmd_portal_auth_flow'

export interface PortalAuthFlowState {
  identifier: string
  channel: Channel
}

export function setPortalAuthFlow(state: PortalAuthFlowState): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getPortalAuthFlow(): PortalAuthFlowState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PortalAuthFlowState) : null
  } catch {
    return null
  }
}

export function clearPortalAuthFlow(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}
