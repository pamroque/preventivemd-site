/**
 * Mock EHR adapter.
 *
 * Returns deterministic fake IDs so the entire pipeline (intake → outbox →
 * adapter → external_ids persistence) can be exercised without real EHR
 * credentials. Switch `EHR_PROVIDER=mock` in env to use this.
 *
 * Determinism matters: the same idempotencyKey always returns the same
 * external IDs. That makes the worker's idempotency story testable.
 */

import {
  EHRAdapter,
  CanonicalPatient,
  CanonicalIntake,
  CreatePatientResult,
  AppointmentResult,
  AppointmentSlot,
  AvailableSlotQuery,
  EhrProvider,
  EHRSyncError,
  BookingConflictError,
} from '../types'

export class MockAdapter implements EHRAdapter {
  readonly providerName = 'mock' as const

  async createPatientWithIntake(input: {
    patient: CanonicalPatient
    intake: CanonicalIntake
    idempotencyKey: string
    patientCanonicalId: string
    clinicalSummaryText: string
    rawIntakePayload?: unknown
    dietitianExternalId?: string
    address?: {
      line1: string
      line2?: string
      city: string
      state: string
      zip: string
      country?: string
    }
  }): Promise<CreatePatientResult> {
    // Deterministic external IDs from idempotency key.
    const seed = input.idempotencyKey.replace(/-/g, '').slice(0, 8)

    // Magic-email retry simulation — useful for testing worker retry logic.
    if (input.patient.email.endsWith('@retry.test')) {
      throw new EHRSyncError({
        message: 'Mock simulated transient failure',
        retryable: true,
        statusCode: 503,
      })
    }

    console.log(
      `[mock-ehr] createPatientWithIntake email=${input.patient.email} ` +
        `key=${input.idempotencyKey} ` +
        `summary_chars=${input.clinicalSummaryText.length}`,
    )

    return {
      externalPatientId: `mock_pt_${seed}`,
      additionalIds: [
        {
          resourceType: 'client_created',
          externalId:   `mock_pt_${seed}`,
          metadata: {
            intakeSubmittedAt: input.intake.submittedAt,
            canonicalId:       input.patientCanonicalId,
          },
        },
      ],
      rawResponse: { provider: 'mock', echoed: input },
    }
  }

  async scheduleAppointment(input: {
    patientExternalId: string
    slot: AppointmentSlot
  }): Promise<AppointmentResult> {
    // Magic-datetime to simulate a race conflict in tests.
    if (input.slot.datetime.includes('CONFLICT')) {
      throw new BookingConflictError({
        message: 'Mock simulated slot taken',
        attemptedSlot: input.slot,
      })
    }

    const seed = (input.patientExternalId + input.slot.datetime).slice(-8)
    return {
      externalAppointmentId: `mock_appt_${seed}`,
      bookedDatetime:        input.slot.datetime,
      joinUrl:               'https://example.com/mock-video',
    }
  }

  async getAvailableSlots(query: AvailableSlotQuery): Promise<AppointmentSlot[]> {
    // Return a few synthetic 20-minute slots between startDate and endDate
    // for testing UI without hitting Healthie.
    const slots: AppointmentSlot[] = []
    const start = new Date(query.startDate)
    const end   = new Date(query.endDate)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue
      for (const hour of [9, 10, 11, 13, 14, 15]) {
        const dt = new Date(d)
        dt.setHours(hour, 0, 0, 0)
        slots.push({
          providerExternalId: 'mock_provider_001',
          datetime:           dt.toISOString(),
          durationMinutes:    20,
          contactType:        query.contactType ?? 'video',
        })
      }
    }
    return slots
  }

  async listProviders(): Promise<EhrProvider[]> {
    // Two synthetic providers for tests. State coverage chosen so any US
    // state has at least one match (mock 1: continental + AK/HI; mock 2:
    // a narrower set so we can exercise the licensure-mismatch path).
    return [
      {
        externalId:    'mock_provider_001',
        firstName:     'Mock',
        lastName:      'Provider One',
        email:         'mock1@example.test',
        phone:         '+15555550001',
        npi:           '1234567890',
        licenseStates: ['NY','CA','TX','FL','IL','PA','OH','GA','NC','MI'],
        languages:     ['English','Spanish'],
        isActive:      true,
        isOrgAdmin:    false,
      },
      {
        externalId:    'mock_provider_002',
        firstName:     'Mock',
        lastName:      'Provider Two',
        email:         'mock2@example.test',
        phone:         '+15555550002',
        licenseStates: ['NY','NJ','CT'],   // tri-state only, for testing routing
        languages:     ['English'],
        isActive:      true,
        isOrgAdmin:    false,
      },
    ]
  }

  async ping(): Promise<{ ok: boolean; detail?: string }> {
    return { ok: true, detail: 'mock adapter always healthy' }
  }
}
