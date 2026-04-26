/**
 * The EHR seam.
 *
 * Every EHR we ever integrate with implements the `EHRAdapter` interface
 * defined in this file. Nothing else in the codebase imports Healthie types
 * directly — they all go through this seam. That's what makes a vendor
 * pivot a one-day project instead of a one-quarter project.
 *
 * Rules of the road for this file:
 *   1. No vendor-specific shapes leak in. If you find yourself writing
 *      `formAnswerGroupId` or `dietitianId` here, stop and rename it to
 *      something neutral.
 *   2. All inputs are *canonical* — already E.164 phones, already ISO
 *      dates, already total-inches heights. Adapters translate canonical
 *      into vendor-specific shapes.
 *   3. All errors surface via `EHRSyncError` with a `retryable` flag so
 *      the outbox worker can decide whether to back off or give up.
 */

// ─── Canonical patient shape ─────────────────────────────────────────────
// Mirrors fields we have on the `patients` table plus a couple derived ones.
// Tier 1 PHI: identity. Tier 2: demographics. Tier 3: vitals.

export type CanonicalSex = 'male' | 'female';

export interface CanonicalPatient {
  // Identity
  firstName: string;
  lastName:  string;
  email:     string;          // lowercased, RFC 5322
  phoneE164: string;          // +1XXXXXXXXXX
  dob:       string;          // YYYY-MM-DD

  // Demographics
  sex:   CanonicalSex;
  state: string;              // 2-letter US

  // Vitals (optional — patient may bail before height-weight step)
  heightInches?: number;
  weightLbs?:    number;
  bmi?:          number;

  // Acquisition / attribution (optional)
  acquisitionSource?:   string;
  acquisitionCampaign?: string;
}

// ─── Canonical intake shape ──────────────────────────────────────────────
// The clinically-meaningful subset of an intake submission. Adapters use
// this plus the rendered clinicalSummaryText (from transform.ts) to
// populate provider-visible fields in the EHR.

export type PriorGLP1Use = 'current' | 'past' | 'never';

export interface CanonicalIntake {
  healthGoals:        string[];
  medicalConditions:  string[];
  medicationsText?:   string;
  priorGLP1Use?:      PriorGLP1Use;
  additionalNotes?:   string;

  // Auto-derived flags. Examples: 'md-review-required', 'bmi-below-27',
  // 'age-under-18'. Surfaced in clinicalSummaryText for provider triage.
  eligibilityFlags:   string[];

  // Consent timestamps (ISO-8601). Undefined if not granted.
  consentTelehealthAt?: string;
  consentHipaaAt?:      string;
  consentTcpaAt?:       string;

  submittedAt: string;
}

// ─── Provider listing (for sync) ─────────────────────────────────────────
// Canonical shape returned by adapter.listProviders(). The sync endpoint
// upserts these into our providers table + provider_external_ids without
// caring which EHR they came from.

export interface EhrProvider {
  /** Vendor's identifier for the provider. */
  externalId:    string
  firstName:     string
  lastName:      string
  email:         string
  phone?:        string
  npi?:          string
  /** Two-letter US state codes the provider is licensed to practice in. */
  licenseStates: string[]
  /**
   * Languages the provider can serve patients in. Healthie's User type
   * exposes a single `preferred_language` rather than an array, so adapters
   * for Healthie return a single-element array (or empty if not set).
   * Future EHRs that support multi-language will return more.
   */
  languages?:    string[]
  /** Whether the provider is currently active in the EHR. */
  isActive:      boolean
  /** True if this user has admin/owner privileges in the EHR (org admins
   *  often appear in organizationMembers but shouldn't be in patient
   *  routing). The sync endpoint may filter these out. */
  isOrgAdmin?:   boolean
  /** Vendor's raw response for debugging. */
  rawResponse?:  unknown
}

// ─── Appointment booking ─────────────────────────────────────────────────

export interface AppointmentSlot {
  /** Vendor's user ID for the provider. */
  providerExternalId: string;
  /** Full datetime — vendor-specific format expected (Healthie returns
   *  strings like "2026-04-27 09:00:00 EDT -04:00"). */
  datetime:           string;
  durationMinutes:    number;
  /** "video" or "phone". Adapter translates to vendor enum. */
  contactType:        'video' | 'phone';
}

export interface AvailableSlotQuery {
  /** Patient state (2-letter). Vendor filters providers by license. */
  state:              string;
  startDate:          string;     // YYYY-MM-DD inclusive
  endDate:            string;     // YYYY-MM-DD inclusive
  /** "video" or "phone" — both is also valid (omit for "any"). */
  contactType?:       'video' | 'phone';
  /** Override the default appointment type. Optional — adapter discovers. */
  appointmentTypeId?: string;
  /** IANA timezone for the slot calculations. Defaults to provider tz. */
  timezone?:          string;
}

// ─── Adapter result types ────────────────────────────────────────────────

export interface CreatePatientResult {
  externalPatientId: string;
  /** Optional appointment booked in the same job. */
  appointment?: {
    externalAppointmentId: string;
    bookedDatetime:        string;
    /** If the worker had to reschedule due to a race, the original slot. */
    originalDatetime?:     string;
    joinUrl?:              string;
  };
  /** Extra mapping rows the worker should persist into ehr_external_ids. */
  additionalIds?: Array<{
    resourceType: string;
    externalId:   string;
    metadata?:    Record<string, unknown>;
  }>;
  /** Vendor's raw response, kept for the audit log. */
  rawResponse?: unknown;
}

export interface AppointmentResult {
  externalAppointmentId: string;
  bookedDatetime:        string;
  joinUrl?:              string;
  rawResponse?:          unknown;
}

// ─── Errors ──────────────────────────────────────────────────────────────

export class EHRSyncError extends Error {
  /** True if the worker should retry (network blips, 5xx, 429). */
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly vendorPayload?: unknown;

  constructor(opts: {
    message: string;
    retryable: boolean;
    statusCode?: number;
    vendorPayload?: unknown;
  }) {
    super(opts.message);
    this.name = 'EHRSyncError';
    this.retryable = opts.retryable;
    this.statusCode = opts.statusCode;
    this.vendorPayload = opts.vendorPayload;
  }
}

/**
 * Thrown by scheduleAppointment when the vendor rejects the booking
 * because the slot was taken between selection and booking. The worker
 * branches on this to run the conflict-recovery flow (query next slot,
 * book that, notify the patient).
 */
export class BookingConflictError extends EHRSyncError {
  /** The slot we tried to book. */
  readonly attemptedSlot: AppointmentSlot;

  constructor(opts: {
    message:        string;
    attemptedSlot:  AppointmentSlot;
    vendorPayload?: unknown;
  }) {
    super({ message: opts.message, retryable: false, vendorPayload: opts.vendorPayload });
    this.name = 'BookingConflictError';
    this.attemptedSlot = opts.attemptedSlot;
  }
}

// ─── The contract ────────────────────────────────────────────────────────

export interface EHRAdapter {
  /** Stable identifier; matches `ehr_external_ids.provider`. */
  readonly providerName: 'healthie' | 'mock';

  /**
   * Create the patient and attach the intake summary.
   *
   * For Healthie this runs `createClient` followed by `updateClient`. The
   * patient row in Healthie will have all demographics filled in plus a
   * provider-readable `quick_notes` field rendered from the intake.
   *
   * MUST be idempotent on retry: a re-run for the same `idempotencyKey`
   * (= submission_id) must NOT create a duplicate patient. Adapters
   * dedupe by email lookup.
   *
   * Inputs:
   *   patient              — canonical demographics
   *   intake               — canonical clinical answers
   *   idempotencyKey       — submission_id, dedupe key
   *   patientCanonicalId   — our Supabase patients.id; sent to vendor as
   *                          a record identifier so we have an explicit
   *                          cross-system link.
   *   clinicalSummaryText  — provider-readable formatted summary of the
   *                          full intake. Adapters drop this into the
   *                          vendor's free-text patient-notes field
   *                          (Healthie's quick_notes).
   *   rawIntakePayload     — opaque JSON-serializable bag of the full
   *                          intake form data. Adapters MAY stash this
   *                          in a vendor metadata field for replay.
   *                          Up to ~120 KB.
   */
  createPatientWithIntake(input: {
    patient:             CanonicalPatient;
    intake:              CanonicalIntake;
    idempotencyKey:      string;
    patientCanonicalId:  string;
    clinicalSummaryText: string;
    rawIntakePayload?:   unknown;
    /**
     * Vendor's user ID for the provider this patient is being assigned to.
     * The worker decides this per-call based on patient state + license
     * routing. Adapters use this as the dietitian/practitioner reference
     * on the vendor's createClient mutation.
     *
     * Optional: when omitted, the adapter falls back to its constructor
     * default (e.g., for the smoke test or single-provider sandboxes).
     */
    dietitianExternalId?: string;
    /**
     * Patient delivery/mailing address. Available at /checkout submit
     * but NOT before. Adapters MUST treat this as optional and only
     * write location data when line1 is present.
     */
    address?: {
      line1:    string;
      line2?:   string;
      city:     string;
      state:    string;        // 2-letter; expected to match patient.state
      zip:      string;
      country?: string;        // default 'US'
    };
  }): Promise<CreatePatientResult>;

  /**
   * Pull the list of providers/practitioners from the EHR. Used by the
   * /api/admin/sync-providers endpoint to populate our local providers
   * table + provider_external_ids mappings.
   *
   * Should return ALL providers (handle pagination internally), not
   * just the current page. Filter out admin-only / non-clinical accounts
   * via isOrgAdmin if needed.
   */
  listProviders(): Promise<EhrProvider[]>;

  /**
   * Book an appointment for an existing patient.
   *
   * The patient must already exist in the EHR (i.e., createPatientWithIntake
   * must have run successfully first). The worker calls this as the third
   * mutation in a sync-visit job.
   *
   * Adapters MUST throw `BookingConflictError` when the vendor reports the
   * slot is taken — the worker uses that to drive the recovery flow.
   */
  scheduleAppointment(input: {
    patientExternalId: string;
    slot:              AppointmentSlot;
  }): Promise<AppointmentResult>;

  /**
   * List bookable time slots for a patient state across all licensed
   * providers in the org. Read-only — does not require a patient record.
   *
   * Powers the calendar on /book-consultation.
   */
  getAvailableSlots(query: AvailableSlotQuery): Promise<AppointmentSlot[]>;

  /**
   * Health check. Called by /api/sync/run before each batch.
   * Should be cheap (single auth-validating query).
   */
  ping(): Promise<{ ok: boolean; detail?: string }>;
}
