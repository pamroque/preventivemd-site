/**
 * Healthie adapter — v1.
 *
 * Implements the EHRAdapter contract against Healthie's GraphQL API using
 * native fields on the User and Appointment models. No custom forms,
 * no UserGroups, no onboarding flows — those are deferred to v1.5+.
 *
 * Per intake submission (async path) we run two mutations:
 *   1. createClient — first/last/email/phone/dob/gender/dietitian_id +
 *                     record_identifier (= our patients.id) + metadata
 *                     (full intake JSON, ≤120 KB).
 *   2. updateClient — sex, height, quick_notes (provider-readable summary),
 *                     location.state.
 *
 * For sync visits the worker additionally calls scheduleAppointment after
 * the two mutations above, using `enforce_availability: true` so Healthie
 * rejects races. The worker handles BookingConflictError by querying
 * availability and re-booking the next open slot.
 *
 * Idempotency: Healthie has no server-side idempotency token, so we look
 * up by email first. If the client already exists, we skip createClient
 * and run updateClient against the existing id.
 *
 * Schema reference (verified 2026-04 from docs.gethealthie.com):
 *   - mutations/createclient + input-objects/createclientinput
 *   - mutations/updateclient + input-objects/updateclientinput
 *   - mutations/createappointment
 *   - queries/availableslotsforrange + queries/appointmenttypes
 *   - input-objects/clientlocationinput
 *
 * Required env vars (validated by the factory):
 *   HEALTHIE_API_URL                  e.g. https://staging-api.gethealthie.com/graphql
 *   HEALTHIE_API_KEY                  sandbox or production
 *   HEALTHIE_DEFAULT_DIETITIAN_ID     numeric id of the test/triage provider
 *
 * Optional env vars:
 *   HEALTHIE_APPOINTMENT_TYPE_ID      override the discovered appointment type
 *   HEALTHIE_APPOINTMENT_TYPE_NAME    name to discover by (default: "Initial Consultation")
 */

import { GraphQLClient, gql } from 'graphql-request'
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

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Map a US state code to an IANA timezone. Best-effort; cross-state edge
 *  cases (e.g., FL straddles ET/CT) get the more populous zone. */
const STATE_TO_TIMEZONE: Record<string, string> = {
  AL: 'America/Chicago',     AK: 'America/Anchorage',
  AZ: 'America/Phoenix',     AR: 'America/Chicago',
  CA: 'America/Los_Angeles', CO: 'America/Denver',
  CT: 'America/New_York',    DE: 'America/New_York',
  DC: 'America/New_York',    FL: 'America/New_York',
  GA: 'America/New_York',    HI: 'Pacific/Honolulu',
  ID: 'America/Boise',       IL: 'America/Chicago',
  IN: 'America/Indiana/Indianapolis',
  IA: 'America/Chicago',     KS: 'America/Chicago',
  KY: 'America/New_York',    LA: 'America/Chicago',
  ME: 'America/New_York',    MD: 'America/New_York',
  MA: 'America/New_York',    MI: 'America/Detroit',
  MN: 'America/Chicago',     MS: 'America/Chicago',
  MO: 'America/Chicago',     MT: 'America/Denver',
  NE: 'America/Chicago',     NV: 'America/Los_Angeles',
  NH: 'America/New_York',    NJ: 'America/New_York',
  NM: 'America/Denver',      NY: 'America/New_York',
  NC: 'America/New_York',    ND: 'America/Chicago',
  OH: 'America/New_York',    OK: 'America/Chicago',
  OR: 'America/Los_Angeles', PA: 'America/New_York',
  RI: 'America/New_York',    SC: 'America/New_York',
  SD: 'America/Chicago',     TN: 'America/Chicago',
  TX: 'America/Chicago',     UT: 'America/Denver',
  VT: 'America/New_York',    VA: 'America/New_York',
  WA: 'America/Los_Angeles', WV: 'America/New_York',
  WI: 'America/Chicago',     WY: 'America/Denver',
}

function timezoneForState(state: string): string {
  return STATE_TO_TIMEZONE[state.toUpperCase()] ?? 'America/New_York'
}

/** Healthie expects "Male" / "Female" capitalized strings. */
function genderForHealthie(sex: 'male' | 'female'): string {
  return sex === 'male' ? 'Male' : 'Female'
}

/** Translate canonical contact type to Healthie's enum. */
function contactTypeForHealthie(t: 'video' | 'phone'): string {
  return t === 'video' ? 'Healthie Video Call' : 'Phone Call'
}

/** Healthie metadata field caps at ~128 KB of serialized JSON. We trim
 *  well below that to leave envelope headroom. If we ever overflow,
 *  return a marker object — never silently drop data. */
const METADATA_MAX = 100_000
function safeStringify(value: unknown): string {
  let s: string
  try {
    s = JSON.stringify(value)
  } catch {
    return JSON.stringify({ truncated: true, reason: 'serialization-failed' })
  }
  if (s.length <= METADATA_MAX) return s
  return JSON.stringify({
    truncated: true,
    originalLength: s.length,
    note: 'Full payload retained in our Supabase intake_submissions.responses',
  })
}

// ─── GraphQL operations ──────────────────────────────────────────────────

const M_CREATE_CLIENT = gql`
  mutation CreateClient($input: createClientInput!) {
    createClient(input: $input) {
      user { id email }
      messages { field message }
    }
  }
`

const M_UPDATE_CLIENT = gql`
  mutation UpdateClient($input: updateClientInput!) {
    updateClient(input: $input) {
      user { id }
      messages { field message }
    }
  }
`

const Q_FIND_BY_EMAIL = gql`
  query FindClientByEmail($email: String!) {
    users(keywords: $email, active_status: "all") {
      id
      email
    }
  }
`

const M_CREATE_APPOINTMENT = gql`
  mutation CreateAppointment(
    $user_id: String
    $appointment_type_id: String
    $contact_type: String
    $other_party_id: String
    $datetime: String
    $enforce_availability: Boolean
  ) {
    createAppointment(input: {
      user_id: $user_id
      appointment_type_id: $appointment_type_id
      contact_type: $contact_type
      other_party_id: $other_party_id
      datetime: $datetime
      enforce_availability: $enforce_availability
    }) {
      appointment { id date contact_type }
      messages { field message }
    }
  }
`

const Q_AVAILABLE_SLOTS = gql`
  query AvailableSlotsForRange(
    $provider_id: String
    $org_level: Boolean
    $licensed_in_state: String
    $appt_type_id: String
    $contact_type: String
    $start_date: String
    $end_date: String
    $timezone: String
  ) {
    availableSlotsForRange(
      provider_id: $provider_id
      org_level: $org_level
      licensed_in_state: $licensed_in_state
      appt_type_id: $appt_type_id
      contact_type: $contact_type
      start_date: $start_date
      end_date: $end_date
      timezone: $timezone
    ) {
      user_id
      date
      is_fully_booked
    }
  }
`

const Q_APPOINTMENT_TYPES = gql`
  query AppointmentTypes {
    appointmentTypes(clients_can_book: true) {
      id
      name
      length
      available_contact_types
    }
  }
`

const Q_PING = gql`query Ping { currentUser { id email } }`

const Q_ORG_MEMBERS = gql`
  query OrganizationMembers(
    $licensed_in_state: String
    $page_size: Int
    $offset: Int
  ) {
    organizationMembers(
      licensed_in_state: $licensed_in_state
      page_size: $page_size
      offset: $offset
    ) {
      id
      first_name
      last_name
      email
      phone_number
      npi
      is_active_provider
      is_org_admin
      is_owner
      archived_at
      preferred_language
      state_licenses {
        state
      }
    }
  }
`

// ─── Adapter ─────────────────────────────────────────────────────────────

export interface HealthieAdapterOptions {
  apiUrl:               string
  apiKey:               string
  /**
   * Fallback dietitian ID for paths that don't go through the worker's
   * data-driven routing (e.g., the smoke test). Optional in production —
   * the worker passes a per-call dietitianExternalId after querying
   * providers + provider_external_ids by patient state.
   */
  defaultDietitianId?:  string
  /** Optional override; if absent, adapter discovers by name on first use. */
  appointmentTypeId?:   string
  /** Name to discover by. Defaults to "Initial Consultation". */
  appointmentTypeName?: string
}

export class HealthieAdapter implements EHRAdapter {
  readonly providerName = 'healthie' as const
  private client: GraphQLClient
  private defaultDietitianId?: string
  private appointmentTypeIdOverride?: string
  private appointmentTypeName: string
  private cachedAppointmentTypeId?: string

  constructor(opts: HealthieAdapterOptions) {
    this.client = new GraphQLClient(opts.apiUrl, {
      headers: {
        Authorization: `Basic ${opts.apiKey}`,
        AuthorizationSource: 'API',
      },
    })
    this.defaultDietitianId        = opts.defaultDietitianId
    this.appointmentTypeIdOverride = opts.appointmentTypeId
    this.appointmentTypeName       = opts.appointmentTypeName ?? 'Initial Consultation'
  }

  // ── createPatientWithIntake ─────────────────────────────────────────
  async createPatientWithIntake(input: {
    patient:             CanonicalPatient
    intake:              CanonicalIntake
    idempotencyKey:      string
    patientCanonicalId:  string
    clinicalSummaryText: string
    rawIntakePayload?:   unknown
    dietitianExternalId?: string
    address?: {
      line1:    string
      line2?:   string
      city:     string
      state:    string
      zip:      string
      country?: string
    }
  }): Promise<CreatePatientResult> {
    const { patient, clinicalSummaryText, rawIntakePayload, patientCanonicalId, address } = input

    // Worker chooses provider per-call based on state-licensure routing.
    // Fall back to the adapter's constructor default for the smoke test
    // path (which doesn't query Supabase for routing).
    const dietitianId = input.dietitianExternalId ?? this.defaultDietitianId
    if (!dietitianId) {
      throw new EHRSyncError({
        message: 'No dietitian_id available — neither dietitianExternalId arg nor adapter default provided',
        retryable: false,
      })
    }

    // 1. Idempotency: reuse existing client by email if present.
    let userId = await this.findClientByEmail(patient.email)
    let createdNew = false

    // 2. createClient if new.
    if (!userId) {
      const createInput = {
        first_name:        patient.firstName,
        last_name:         patient.lastName,
        email:             patient.email,
        phone_number:      patient.phoneE164,
        dob:               patient.dob,
        gender:            genderForHealthie(patient.sex),
        dietitian_id:      dietitianId,
        record_identifier: patientCanonicalId,
        timezone:          timezoneForState(patient.state),
        dont_send_welcome: false,
        metadata:          safeStringify({
          patient,
          intake:             input.intake,
          rawIntakePayload,
          submissionId:       input.idempotencyKey,
          patientCanonicalId,
        }),
      }

      const created = await this.safeRequest<any>(M_CREATE_CLIENT, { input: createInput })
      const messages = created?.createClient?.messages ?? []
      if (messages.length > 0) {
        throw new EHRSyncError({
          message: `Healthie createClient validation failed: ${JSON.stringify(messages)}`,
          retryable: false,
          vendorPayload: messages,
        })
      }
      userId = created?.createClient?.user?.id
      if (!userId) {
        throw new EHRSyncError({
          message: 'Healthie createClient returned no user id',
          retryable: true,
          vendorPayload: created,
        })
      }
      createdNew = true
    }

    // 3. updateClient: clinical fields + provider-visible summary.
    //    Run unconditionally — idempotent: re-running just overwrites.
    const updateInput: Record<string, unknown> = {
      id:          userId,
      sex:         genderForHealthie(patient.sex),
      quick_notes: clinicalSummaryText,
    }
    if (patient.heightInches != null) {
      updateInput.height = String(patient.heightInches)
    }
    // Healthie's API rejects a location payload that's missing line1
    // (their schema marks all address fields optional but the server
    // enforces line1). Only attach a location when we actually have
    // a street address — that arrives at /checkout, not earlier.
    if (address?.line1) {
      updateInput.location = {
        line1:   address.line1,
        line2:   address.line2,
        city:    address.city,
        state:   address.state || patient.state,
        zip:     address.zip,
        country: address.country ?? 'US',
      }
    }

    const updated = await this.safeRequest<any>(M_UPDATE_CLIENT, { input: updateInput })
    const updateMessages = updated?.updateClient?.messages ?? []
    if (updateMessages.length > 0) {
      // Patient was created but couldn't be enriched. Mark retryable so the
      // worker tries again — idempotency on creation prevents duplicates.
      throw new EHRSyncError({
        message: `Healthie updateClient validation failed: ${JSON.stringify(updateMessages)}`,
        retryable: true,
        vendorPayload: updateMessages,
      })
    }

    return {
      externalPatientId: userId,
      additionalIds: [
        {
          resourceType: createdNew ? 'client_created' : 'client_reused',
          externalId:   userId,
          metadata: { dietitianId },
        },
      ],
      rawResponse: { createdNew, userId },
    }
  }

  // ── scheduleAppointment ─────────────────────────────────────────────
  async scheduleAppointment(input: {
    patientExternalId: string
    slot: AppointmentSlot
  }): Promise<AppointmentResult> {
    const apptTypeId = await this.resolveAppointmentTypeId()

    const variables = {
      user_id:              input.patientExternalId,
      appointment_type_id:  apptTypeId,
      contact_type:         contactTypeForHealthie(input.slot.contactType),
      other_party_id:       input.slot.providerExternalId,
      datetime:             input.slot.datetime,
      enforce_availability: true,                // race protection
    }

    const resp = await this.safeRequest<any>(M_CREATE_APPOINTMENT, variables)
    const messages = resp?.createAppointment?.messages ?? []

    if (messages.length > 0) {
      // Healthie returns errors in `messages`. Detect availability conflicts
      // by message field/text. Other errors are non-retryable validation.
      const isConflict = messages.some((m: any) => {
        const text = `${m?.field ?? ''} ${m?.message ?? ''}`.toLowerCase()
        return (
          text.includes('availab') ||
          text.includes('conflict') ||
          text.includes('already booked') ||
          text.includes('not available')
        )
      })
      if (isConflict) {
        throw new BookingConflictError({
          message: `Healthie reported slot unavailable: ${JSON.stringify(messages)}`,
          attemptedSlot: input.slot,
          vendorPayload: messages,
        })
      }
      throw new EHRSyncError({
        message: `Healthie createAppointment validation failed: ${JSON.stringify(messages)}`,
        retryable: false,
        vendorPayload: messages,
      })
    }

    const appt = resp?.createAppointment?.appointment
    if (!appt?.id) {
      throw new EHRSyncError({
        message: 'Healthie createAppointment returned no appointment id',
        retryable: true,
        vendorPayload: resp,
      })
    }

    return {
      externalAppointmentId: appt.id,
      bookedDatetime:        appt.date ?? input.slot.datetime,
      rawResponse:           resp,
    }
  }

  // ── getDefaultAppointmentTypeId ──────────────────────────────────────
  // Public form of resolveAppointmentTypeId — exposed so /api/availability
  // and the admin sync-providers endpoint can surface the resolved id
  // without duplicating the discover-by-name logic.
  async getDefaultAppointmentTypeId(): Promise<string> {
    return this.resolveAppointmentTypeId()
  }

  // ── getAvailableSlots ────────────────────────────────────────────────
  async getAvailableSlots(query: AvailableSlotQuery): Promise<AppointmentSlot[]> {
    const apptTypeId = query.appointmentTypeId ?? (await this.resolveAppointmentTypeId())

    // Healthie's availableSlotsForRange requires provider_id even when
    // org_level=true (it's the org anchor, not the only provider searched).
    // We pass our default provider; org_level + licensed_in_state together
    // still expand the search to all licensed providers in the org.
    const variables: Record<string, unknown> = {
      provider_id:       this.defaultDietitianId,
      org_level:         true,
      licensed_in_state: query.state,
      appt_type_id:      apptTypeId,
      start_date:        query.startDate,
      end_date:          query.endDate,
      timezone:          query.timezone ?? timezoneForState(query.state),
    }
    if (query.contactType) {
      variables.contact_type = contactTypeForHealthie(query.contactType)
    }

    const resp = await this.safeRequest<any>(Q_AVAILABLE_SLOTS, variables)
    const rawSlots: Array<{ user_id: string; date: string; is_fully_booked: boolean }> =
      resp?.availableSlotsForRange ?? []

    return rawSlots
      .filter((s) => !s.is_fully_booked)
      .map((s) => ({
        providerExternalId: s.user_id,
        datetime:           s.date,
        durationMinutes:    20,
        contactType:        query.contactType ?? 'video',
      }))
  }

  // ── listProviders ────────────────────────────────────────────────────
  // Pull all org members from Healthie via the organizationMembers query.
  // Paginates internally (page_size=100 max). Filters out clearly non-
  // clinical accounts (org admins/owners with no licensed states) so the
  // sync endpoint doesn't seed them as routable providers.
  async listProviders(): Promise<EhrProvider[]> {
    const PAGE_SIZE = 100
    const all: any[] = []
    let offset = 0

    // Healthie returns all members; loop until we get less than a full
    // page back or hit a sane safety cap.
    for (let page = 0; page < 50; page++) {
      const r: any = await this.safeRequest<any>(Q_ORG_MEMBERS, {
        page_size: PAGE_SIZE,
        offset,
      })
      const members = r?.organizationMembers ?? []
      all.push(...members)
      if (members.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }

    // Map vendor shape → canonical EhrProvider.
    return all
      // Skip soft-deleted/archived users.
      .filter((m: any) => !m.archived_at)
      .map((m: any): EhrProvider => {
        const stateLicenses: Array<{ state: string }> = m.state_licenses ?? []
        const states = stateLicenses
          .map((sl) => sl?.state?.toUpperCase())
          .filter((s): s is string => !!s)
        // Healthie tracks a single preferred_language per user. We expose
        // it as a one-element array on canonical so multi-language EHRs
        // can layer in seamlessly. Default to English when unset.
        const lang = (m.preferred_language ?? '').trim()
        const languages = lang ? [lang] : ['English']
        return {
          externalId:    String(m.id),
          firstName:     m.first_name ?? '',
          lastName:      m.last_name ?? '',
          email:         (m.email ?? '').toLowerCase(),
          phone:         m.phone_number ?? undefined,
          npi:           m.npi ?? undefined,
          licenseStates: states,
          languages,
          // is_active_provider is the clinical-side active flag; org
          // admins/owners may be true here too. The sync endpoint can
          // further filter via licenseStates.length > 0 if needed.
          isActive:      m.is_active_provider !== false,
          isOrgAdmin:    !!m.is_org_admin || !!m.is_owner,
          rawResponse:   m,
        }
      })
  }

  // ── ping ─────────────────────────────────────────────────────────────
  async ping(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const r: any = await this.client.request(Q_PING)
      const email = r?.currentUser?.email
      return { ok: true, detail: email ? `authenticated as ${email}` : 'authenticated' }
    } catch (err: any) {
      return { ok: false, detail: err?.message ?? String(err) }
    }
  }

  // ─── private ─────────────────────────────────────────────────────────

  private async findClientByEmail(email: string): Promise<string | null> {
    try {
      const r: any = await this.client.request(Q_FIND_BY_EMAIL, { email })
      const match = (r?.users ?? []).find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
      )
      return match?.id ?? null
    } catch {
      // Lookup failures are non-fatal — fall through to create. If the
      // create then fails because the email is taken, that surfaces with
      // retryable=false and ops can reconcile.
      return null
    }
  }

  /** Discover the appointment type ID by name on first use; cache. */
  private async resolveAppointmentTypeId(): Promise<string> {
    if (this.appointmentTypeIdOverride) return this.appointmentTypeIdOverride
    if (this.cachedAppointmentTypeId)   return this.cachedAppointmentTypeId

    const r: any = await this.safeRequest<any>(Q_APPOINTMENT_TYPES, {})
    const types: Array<{ id: string; name: string }> = r?.appointmentTypes ?? []
    const match = types.find(
      (t) => t.name?.toLowerCase() === this.appointmentTypeName.toLowerCase(),
    )
    if (!match?.id) {
      throw new EHRSyncError({
        message:
          `Could not find Healthie appointment type named "${this.appointmentTypeName}". ` +
          `Available types: ${types.map((t) => t.name).join(', ')}. ` +
          `Either rename the type in Healthie admin, set HEALTHIE_APPOINTMENT_TYPE_ID, ` +
          `or set HEALTHIE_APPOINTMENT_TYPE_NAME.`,
        retryable: false,
      })
    }
    this.cachedAppointmentTypeId = match.id
    return match.id
  }

  private async safeRequest<T>(query: any, variables: any): Promise<T> {
    try {
      return await this.client.request<T>(query, variables)
    } catch (err: any) {
      const status = err?.response?.status
      const retryable = !status || status === 408 || status === 429 || status >= 500
      throw new EHRSyncError({
        message: `Healthie request failed: ${err?.message ?? 'unknown'}`,
        retryable,
        statusCode: status,
        vendorPayload: err?.response?.errors ?? err?.response,
      })
    }
  }
}
