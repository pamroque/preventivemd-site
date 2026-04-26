/**
 * EHR adapter factory.
 *
 * The single place we resolve EHR_PROVIDER env into a concrete adapter.
 * If you find yourself reading process.env.EHR_PROVIDER anywhere else,
 * import from here instead — that's how the seam stays one file wide.
 */

import type { EHRAdapter } from './types'
import { HealthieAdapter } from './healthie'
import { MockAdapter } from './mock'

let cached: EHRAdapter | null = null

export function getEHRAdapter(): EHRAdapter {
  if (cached) return cached

  const provider = (process.env.EHR_PROVIDER ?? 'mock').toLowerCase()

  switch (provider) {
    case 'healthie':
      cached = new HealthieAdapter({
        apiUrl:               requireEnv('HEALTHIE_API_URL'),
        apiKey:               requireEnv('HEALTHIE_API_KEY'),
        defaultDietitianId:   requireEnv('HEALTHIE_DEFAULT_DIETITIAN_ID'),
        appointmentTypeId:    process.env.HEALTHIE_APPOINTMENT_TYPE_ID,
        appointmentTypeName:  process.env.HEALTHIE_APPOINTMENT_TYPE_NAME,
      })
      break
    case 'mock':
      cached = new MockAdapter()
      break
    default:
      throw new Error(
        `EHR_PROVIDER="${provider}" is not a recognized adapter. ` +
        `Valid values: 'mock' | 'healthie'.`,
      )
  }
  return cached
}

/** Test helper — clears the cached adapter so unit tests can swap env. */
export function __resetEHRAdapterCache() {
  cached = null
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(
      `Missing env var ${name}. Set it in .env.local or your Vercel environment.`,
    )
  }
  return v
}

export type {
  EHRAdapter,
  CanonicalPatient,
  CanonicalIntake,
  AppointmentSlot,
  AvailableSlotQuery,
  CreatePatientResult,
  AppointmentResult,
} from './types'
export { EHRSyncError, BookingConflictError } from './types'
