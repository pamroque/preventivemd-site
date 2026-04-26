/**
 * Form → canonical transforms.
 *
 * Pure functions only. No I/O, no side effects, fully unit-testable. If
 * you find yourself needing a network call here, you're at the wrong
 * abstraction layer — push it into the adapter.
 *
 * Encodes:
 *   - Phone normalization to E.164 (US-only for now)
 *   - Height: feet+inches → total inches
 *   - BMI: lbs/(in²) × 703, rounded to 1 decimal
 *   - Eligibility flags derived from BMI + conditions + age (mirrors
 *     XLSX tab 4 cross-field rules — kept in sync with that doc)
 *   - Clinical summary formatter for the EHR's free-text notes field
 */

import type { IntakeData } from '@/lib/intake-flow'
import type {
  CanonicalPatient,
  CanonicalIntake,
  PriorGLP1Use,
} from './types'

// ─── Inputs not present in IntakeData ────────────────────────────────────
// Email arrives at /checkout, not earlier. UTM params come from URL params.
// Consents — for v1 we treat the "I agree to T&C" click on /get-started as
// implicit consent and pass a timestamp in. When we add explicit consent
// steps later, swap this to read from IntakeData.

export interface IntakeExtras {
  email:      string
  submittedAt?: string                // ISO-8601; defaults to now()
  consents?: {
    telehealth?: boolean
    hipaa?:      boolean
    tcpa?:       boolean
  }
  acquisition?: {
    source?:   string
    campaign?: string
  }
  priorGLP1Use?: PriorGLP1Use
}

// ─── Eligibility-flag rules ──────────────────────────────────────────────
// These conditions route to MD-only review per the field-mapping XLSX.
const MD_ONLY_CONDITIONS = new Set(['kidney', 'mtc', 'men2', 'pregnancy', 'pancreatitis'])

// ─── Pure helpers ────────────────────────────────────────────────────────

/** Compute BMI from feet/inches/lbs. Returns undefined if any input missing. */
export function computeBmi(
  feet:   string | number,
  inches: string | number,
  lbs:    string | number,
): number | undefined {
  const ft  = Number(feet)
  const inc = Number(inches) || 0
  const w   = Number(lbs)
  if (!ft || !w) return undefined
  const totalIn = ft * 12 + inc
  if (!totalIn) return undefined
  return Math.round(((w / (totalIn * totalIn)) * 703) * 10) / 10
}

/** Total height in inches. Returns undefined if feet missing. */
export function toTotalInches(
  feet:   string | number,
  inches: string | number,
): number | undefined {
  const ft  = Number(feet)
  const inc = Number(inches) || 0
  if (!ft) return undefined
  return ft * 12 + inc
}

/**
 * Normalize a US phone number to E.164. US-only by design (telehealth scope).
 *
 * Accepts common formats — "(415) 555-2671", "415-555-2671", "+1 415 555 2671" —
 * and returns "+14155552671". Returns undefined if the input doesn't look like
 * a 10-digit US number (or 11 digits starting with 1). The form already validates
 * format on the client; this is a defensive normalization for the EHR.
 */
export function toE164(raw: string): string | undefined {
  if (!raw) return undefined
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10)                     return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  return undefined
}

/** Compute age in whole years from a YYYY-MM-DD DOB. */
export function ageFromDob(dob: string, today = new Date()): number | undefined {
  if (!dob) return undefined
  const d = new Date(dob)
  if (isNaN(d.getTime())) return undefined
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  return age
}

/** Derive eligibility flags from cross-field rules. */
export function deriveEligibilityFlags(args: {
  bmi?:        number
  conditions:  string[]
  desiredTreatments?: string[]
  ageYears?:   number
}): string[] {
  const flags: string[] = []

  // GLP-1 path BMI gate (BMI < 27 with no comorbidities → MD review).
  const wantsGLP1 = args.desiredTreatments?.includes('glp1')
  if (wantsGLP1 && args.bmi != null && args.bmi < 27) {
    flags.push('bmi-below-27')
  }

  // High-risk conditions → MD review.
  if (args.conditions.some((c) => MD_ONLY_CONDITIONS.has(c))) {
    flags.push('md-review-required')
  }

  // Age sanity.
  if (args.ageYears != null && args.ageYears < 18) {
    flags.push('age-under-18')
  }

  return flags
}

/** Derive prior GLP-1 use enum from the form's checkbox + history fields. */
export function derivePriorGLP1Use(data: IntakeData): PriorGLP1Use | undefined {
  // Form-stated by user
  if (data.priorWeightMgmt?.includes('glp1')) {
    // They've used GLP-1 before. Whether currently using vs past is
    // not collected explicitly; we default to 'past'. The form can
    // be extended later to disambiguate.
    return 'past'
  }
  // No GLP-1 history checkbox → never used.
  if (data.priorWeightMgmt?.length) return 'never'
  return undefined
}

// ─── Top-level transform ─────────────────────────────────────────────────

export interface TransformResult {
  patient: CanonicalPatient
  intake:  CanonicalIntake
  /** Validation errors. Empty array = valid. */
  errors:  string[]
}

export function intakeToCanonical(
  data:   IntakeData,
  extras: IntakeExtras,
  now:    Date = new Date(),
): TransformResult {
  const errors: string[] = []

  const phoneE164 = toE164(data.phone)
  if (!phoneE164) errors.push('phone: invalid US number')

  const heightInches = toTotalInches(data.heightFeet, data.heightInches)
  const weightLbs    = data.weight ? Number(data.weight) : undefined
  const bmi          = computeBmi(data.heightFeet, data.heightInches, data.weight)

  if (data.sex !== 'male' && data.sex !== 'female') {
    errors.push('sex: must be male|female')
  }

  const ageYears = ageFromDob(data.dob, now)
  if (ageYears == null || ageYears < 18) {
    errors.push('dob: must be 18 or older')
  }

  const eligibilityFlags = deriveEligibilityFlags({
    bmi,
    conditions: data.medicalConditions ?? [],
    desiredTreatments: data.desiredTreatments,
    ageYears,
  })

  const medicationsText = [
    ...(data.medications ?? []),
    data.medicationsOther?.trim(),
  ].filter(Boolean).join('; ') || undefined

  const patient: CanonicalPatient = {
    firstName: data.firstName.trim(),
    lastName:  data.lastName.trim(),
    email:     extras.email.toLowerCase().trim(),
    phoneE164: phoneE164 ?? '',
    dob:       data.dob,
    sex:       (data.sex === 'male' || data.sex === 'female') ? data.sex : 'female',
    state:     data.state,
    heightInches,
    weightLbs,
    bmi,
    acquisitionSource:   extras.acquisition?.source,
    acquisitionCampaign: extras.acquisition?.campaign,
  }

  const nowIso = (extras.submittedAt ?? now.toISOString())
  const intake: CanonicalIntake = {
    healthGoals:       data.healthGoals ?? [],
    medicalConditions: data.medicalConditions ?? [],
    medicationsText,
    priorGLP1Use:      extras.priorGLP1Use ?? derivePriorGLP1Use(data),
    additionalNotes:   undefined,
    eligibilityFlags,
    consentTelehealthAt: extras.consents?.telehealth ? nowIso : undefined,
    consentHipaaAt:      extras.consents?.hipaa      ? nowIso : undefined,
    consentTcpaAt:       extras.consents?.tcpa       ? nowIso : undefined,
    submittedAt:         nowIso,
  }

  return { patient, intake, errors }
}

// ─── Clinical summary formatter ──────────────────────────────────────────
// Renders the full intake into a readable text block that goes into
// Healthie's `quick_notes` field — what providers see when they open
// the chart.
//
// Constraints:
//   - Plain text, not markdown. EHR chart panels render preformatted
//     text; markdown syntax shows up as literal characters.
//   - Stable section order. Providers learn to scan; reordering hurts.
//   - Empty sections are omitted entirely.
//   - Free-text fields are truncated to keep the summary readable.

const TRUNCATE_LIMIT = 500

function trim(s: string | undefined | null, max = TRUNCATE_LIMIT): string {
  if (!s) return ''
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean
}

const HEALTH_GOAL_LABELS: Record<string, string> = {
  'weight-loss':       'Lose weight & improve metabolic health',
  'energy-longevity':  'Improve energy & longevity',
  recovery:            'Support recovery & healing',
  'sleep-focus':       'Sleep better, calmer, more focused',
  'skin-hair':         'Improve skin & hair',
  'sexual-wellness':   'Improve sexual wellness',
  immune:              'Support immune health',
  other:               'Other',
}

const CONDITION_LABELS: Record<string, string> = {
  pregnancy:        'Pregnancy / breastfeeding',
  gallbladder:      'Gallbladder disease',
  pancreatitis:     'Pancreatitis',
  substance:        'Substance/alcohol-use disorder',
  gastroparesis:    'Gastroparesis / severe GI motility',
  'type1-diabetes': 'Type 1 diabetes',
  'type2-diabetes': 'Type 2 diabetes',
  seizure:          'Seizure disorder',
  mtc:              'Medullary thyroid cancer (personal or family hx)',
  men2:             'MEN type 2',
  'mental-health':  'Mental-health crisis history',
  kidney:           'Kidney disease',
  'heart-cancer':   'Severe heart disease, cancer, or family cancer hx',
}

const MEDICATION_LABELS: Record<string, string> = {
  insulin:           'Insulin',
  sulfonylureas:     'Sulfonylureas',
  metformin:         'Metformin / oral diabetes med',
  'blood-thinners':  'Blood thinner (e.g., warfarin)',
  'bp-meds':         'BP medication',
  steroids:          'Corticosteroid (e.g., prednisone)',
  thyroid:           'Thyroid medication',
  psychiatric:       'Bipolar / antipsychotic',
  'pain-meds':       'Chronic pain medication',
  'seizure-meds':    'Seizure medication',
  immunosuppressant: 'Immunosuppressant / transplant',
  'known-interactions': 'Known interactions / allergies',
}

const PRIOR_MGMT_LABELS: Record<string, string> = {
  diet:        'Diet changes',
  exercise:    'Exercise programs',
  supplements: 'Supplements',
  'rx-meds':   'Prescription medications',
  glp1:        'GLP-1 medication (Ozempic / Wegovy / etc.)',
  surgery:     'Bariatric surgery',
}

function joinLabels(values: string[] | undefined, dict: Record<string, string>): string {
  if (!values || values.length === 0) return ''
  return values
    .filter((v) => v !== 'none')
    .map((v) => dict[v] ?? v)
    .join(', ')
}

/**
 * Build the provider-facing clinical summary.
 *
 * @param data    raw IntakeData straight from the form payload
 * @param patient canonical patient (for height/weight/BMI rendering)
 * @param intake  canonical intake (for eligibility flags, consents)
 */
export function formatClinicalSummary(
  data:    IntakeData,
  patient: CanonicalPatient,
  intake:  CanonicalIntake,
): string {
  const sections: string[] = []

  // Header
  sections.push(
    `INTAKE SUMMARY — submitted ${intake.submittedAt}\n` +
    `State of residence: ${patient.state}\n` +
    `Visit type requested: ${data.visitType ? data.visitType.toUpperCase() : 'unspecified'}`,
  )

  // Goals
  const goals = joinLabels(data.healthGoals, HEALTH_GOAL_LABELS)
  if (goals) sections.push(`HEALTH GOALS\n${goals}`)

  // Vitals
  const vitalsLines: string[] = []
  if (patient.heightInches != null) {
    const ft = Math.floor(patient.heightInches / 12)
    const inch = patient.heightInches % 12
    vitalsLines.push(`Height: ${ft}ft ${inch}in (${patient.heightInches} in)`)
  }
  if (patient.weightLbs != null) vitalsLines.push(`Weight: ${patient.weightLbs} lbs`)
  if (patient.bmi != null)       vitalsLines.push(`BMI: ${patient.bmi}`)
  if (data.weightGoal)           vitalsLines.push(`Weight goal: ${data.weightGoal}`)
  if (vitalsLines.length) sections.push(`VITALS\n${vitalsLines.join('\n')}`)

  // Weight management history
  const priorMgmt = joinLabels(data.priorWeightMgmt, PRIOR_MGMT_LABELS)
  if (priorMgmt) {
    let txt = `Prior approaches tried: ${priorMgmt}`
    if (data.glp1History?.length) {
      txt += `\nPrior GLP-1 medications: ${data.glp1History.join(', ')}`
    }
    if (data.glp1Reactions === 'yes') {
      txt += `\nAdverse reaction to GLP-1: YES`
      if (data.glp1ReactionDetails) txt += ` — ${trim(data.glp1ReactionDetails, 300)}`
    } else if (data.glp1Reactions === 'no') {
      txt += `\nAdverse reaction to GLP-1: no`
    }
    sections.push(`WEIGHT MANAGEMENT HISTORY\n${txt}`)
  }

  // Recent weight change
  if (data.recentWeightChange === 'yes') {
    let txt = 'Recent significant weight change: YES'
    if (data.weightLossAmount) txt += `\nDetails: ${trim(data.weightLossAmount, 300)}`
    sections.push(`RECENT WEIGHT CHANGE\n${txt}`)
  }

  // Medical conditions
  const conditions = joinLabels(data.medicalConditions, CONDITION_LABELS)
  const conditionsExtra = trim(data.conditionsOther, 300)
  if (conditions || conditionsExtra) {
    let txt = conditions || 'None reported from list'
    if (conditionsExtra) txt += `\nOther: ${conditionsExtra}`
    sections.push(`MEDICAL CONDITIONS\n${txt}`)
  }

  // Medications
  const meds = joinLabels(data.medications, MEDICATION_LABELS)
  const medsExtra = trim(data.medicationsOther, 300)
  if (meds || medsExtra) {
    let txt = meds || 'None reported from list'
    if (medsExtra) txt += `\nOther: ${medsExtra}`
    sections.push(`CURRENT MEDICATIONS\n${txt}`)
  }

  // Lifestyle
  const lifestyleLines: string[] = []
  if (data.diet)              lifestyleLines.push(`Diet: ${data.diet}`)
  if (data.exerciseFrequency) lifestyleLines.push(`Exercise: ${data.exerciseFrequency}`)
  if (data.sleepQuality)      lifestyleLines.push(`Sleep quality: ${data.sleepQuality}`)
  if (data.sleepHours)        lifestyleLines.push(`Sleep hours: ${data.sleepHours}`)
  if (data.stressLevel)       lifestyleLines.push(`Stress: ${data.stressLevel}`)
  if (lifestyleLines.length) sections.push(`LIFESTYLE\n${lifestyleLines.join('\n')}`)

  // Treatment preferences (patient-stated)
  if (data.desiredTreatments?.length) {
    sections.push(
      `TREATMENT PREFERENCES (patient-stated)\n${data.desiredTreatments.join(', ')}`,
    )
  }

  // Eligibility flags (auto-derived)
  if (intake.eligibilityFlags.length) {
    sections.push(`ELIGIBILITY FLAGS (auto)\n${intake.eligibilityFlags.join(', ')}`)
  }

  return sections.join('\n\n')
}
