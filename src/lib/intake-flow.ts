/*
 * intake-flow.ts — State machine for the intake form
 *
 * KEY CONCEPT: State Machine-Driven Forms
 *
 * Instead of a flat array of steps (step 1 → step 2 → step 3),
 * this defines a GRAPH where each step knows:
 *   - What to render (component type + config)
 *   - Where to go next (which can depend on the user's answers)
 *
 * This is how you handle conditional branching without spaghetti code.
 * The form engine reads this config and follows the arrows.
 *
 * Think of it like a choose-your-own-adventure book:
 *   Step "height-weight" → if BMI >= 25, go to "weight-goal"
 *                        → otherwise, skip to "health-goals"
 *
 * FLOW (derived from Figma designs + FigJam flowchart):
 *
 *   get-started
 *       ↓
 *   personal-info (name, DOB, sex, state, phone)
 *       ↓
 *   height-weight
 *       ↓
 *   ◇ BMI >= 25?
 *   ├─ YES → weight-goal → prior-weight-mgmt → ◇ tried GLP-1?
 *   │                                           ├─ YES → glp1-experience
 *   │                                           └─ NO ──┐
 *   └─ NO ────────────────────────────────────────────────┘
 *       ↓
 *   health-goals (checkbox grid)
 *       ↓
 *   weight-change (past 12 months)
 *       ↓
 *   medical-conditions (checkbox list)
 *       ↓
 *   medications (checkbox list)
 *       ↓
 *   diet → exercise → sleep-quality → sleep-hours → stress
 *       ↓
 *   ◇ State requires sync visit?
 *   ├─ YES → sync-scheduling (calendar + time) → payment
 *   └─ NO  → async-medication-request
 *       ↓
 *   desired-treatments (optional treatment selection)
 *       ↓
 *   confirmation
 */

// ── TYPES ────────────────────────────────────────────────

export type StepType =
  | 'welcome'          // Get Started screen with Eve intro
  | 'form'             // Standard form fields (inputs, selects)
  | 'single-select'    // One option from a list (radio-style)
  | 'multi-select'     // Multiple checkboxes
  | 'yes-no'           // Yes/No with optional follow-up
  | 'radio-chips'      // Pill-shaped radio options (exercise, sleep, etc.)
  | 'text-input'       // Single text/textarea question
  | 'calendar'         // Date + time slot picker
  | 'treatment-picker' // Treatment card selection
  | 'confirmation'     // Final confirmation screen

export type StepConfig = {
  id: string
  type: StepType
  title: string                    // Eve's chat bubble text
  subtitle?: string                // Secondary text below title
  hint?: string                    // "Why we ask" or helper text
  fields?: FieldConfig[]           // For 'form' type steps
  options?: OptionConfig[]         // For select/checkbox steps
  placeholder?: string             // For text-input steps
  required?: boolean               // Must answer before continuing
  next: string | ((data: IntakeData) => string)  // Static or conditional next step
}

export type FieldConfig = {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'radio'
  placeholder?: string
  required?: boolean
  options?: { label: string; value: string }[]  // For select/radio
  half?: boolean                                // Half-width (side by side)
}

export type OptionConfig = {
  label: string
  value: string
  description?: string
  icon?: string
}

// ── FORM DATA ────────────────────────────────────────────

export type IntakeData = {
  // Personal info
  firstName: string
  lastName: string
  sex: 'female' | 'male' | ''
  dob: string
  state: string
  phone: string
  smsOptIn: boolean

  // Body metrics
  heightFeet: string
  heightInches: string
  weight: string

  // Weight management (conditional — only if BMI >= 25)
  weightGoal: string
  priorWeightMgmt: string[]
  glp1History: string[]
  glp1Reactions: 'yes' | 'no' | ''
  glp1ReactionDetails: string

  // Health goals
  healthGoals: string[]

  // Weight change
  recentWeightChange: 'yes' | 'no' | ''
  weightLossAmount: string

  // Medical history
  medicalConditions: string[]
  conditionsOther: string
  medications: string[]
  medicationsOther: string

  // Lifestyle
  exerciseFrequency: string
  sleepQuality: string
  sleepHours: string
  stressLevel: string
  diet: string

  // Visit type (determined by state)
  visitType: 'async' | 'sync' | ''

  // Scheduling (sync only)
  appointmentDate: string
  appointmentTime: string

  // Treatment preferences
  desiredTreatments: string[]

  // Computed
  bmi: number | null
}

export const defaultIntakeData: IntakeData = {
  firstName: '',
  lastName: '',
  sex: '',
  dob: '',
  state: '',
  phone: '',
  smsOptIn: false,
  heightFeet: '',
  heightInches: '',
  weight: '',
  weightGoal: '',
  priorWeightMgmt: [],
  glp1History: [],
  glp1Reactions: '',
  glp1ReactionDetails: '',
  healthGoals: [],
  recentWeightChange: '',
  weightLossAmount: '',
  medicalConditions: [],
  conditionsOther: '',
  medications: [],
  medicationsOther: '',
  exerciseFrequency: '',
  sleepQuality: '',
  sleepHours: '',
  stressLevel: '',
  diet: '',
  visitType: '',
  appointmentDate: '',
  appointmentTime: '',
  desiredTreatments: [],
  bmi: null,
}

// ── HELPERS ────────────────────────────────────────────────

/** Calculate BMI from height (ft/in) and weight (lbs) */
export function calculateBMI(feet: string, inches: string, weight: string): number | null {
  const ft = parseInt(feet)
  const inc = parseInt(inches) || 0
  const lbs = parseFloat(weight)
  if (!ft || !lbs) return null
  const totalInches = ft * 12 + inc
  return (lbs / (totalInches * totalInches)) * 703
}

/**
 * States that require a synchronous (video) visit per telehealth
 * regulations. Patients in these states are routed to the live-consultation
 * booking flow regardless of personal preference, and the booking page
 * locks the format to Video.
 *
 * Single source of truth — both `/api/intake` (server-side visitType
 * classification) and the questionnaire UI pages import from here.
 */
export const SYNC_REQUIRED_STATES = [
  'KY', 'LA', 'NM', 'RI', 'WV',
] as const

/** Membership check that's a touch faster than `.includes()` for callers
 *  on a hot path. Both forms return the same answer. */
export const SYNC_REQUIRED_STATES_SET = new Set<string>(SYNC_REQUIRED_STATES)

/** States where PreventiveMD is not currently licensed to operate. Users
 *  selecting one of these at intake should be blocked from continuing
 *  rather than routed into an async or sync path. */
export const BLOCKED_STATES = [
  'AK', 'MS', 'NJ',
] as const

export const BLOCKED_STATES_SET = new Set<string>(BLOCKED_STATES)

/** US states for the dropdown */
export const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'Washington D.C.' },
]

// ── STEP DEFINITIONS ────────────────────────────────────────
// Each step in the intake flow, with conditional routing.

export const INTAKE_STEPS: Record<string, StepConfig> = {

  // ─── WELCOME ──────────────────────────────────────────────
  'get-started': {
    id: 'get-started',
    type: 'welcome',
    title: "I'm Eve, and I'll be your concierge. Getting started is simple.",
    next: 'personal-info',
  },

  // ─── PERSONAL INFO ────────────────────────────────────────
  'personal-info': {
    id: 'personal-info',
    type: 'form',
    title: "First, I'll need some basic personal and contact information.",
    subtitle: 'Fields marked with an asterisk (*) are required',
    fields: [
      { name: 'firstName', label: 'First name', type: 'text', placeholder: '', required: true, half: true },
      { name: 'lastName', label: 'Last name', type: 'text', placeholder: '', required: true, half: true },
      { name: 'sex', label: 'Sex assigned at birth', type: 'radio', required: true, options: [
        { label: 'Female', value: 'female' },
        { label: 'Male', value: 'male' },
      ]},
      { name: 'dob', label: 'Date of birth', type: 'date', required: true, half: true },
      { name: 'state', label: 'State', type: 'select', required: true, half: true },
      { name: 'phone', label: 'Mobile number', type: 'tel', required: true },
    ],
    required: true,
    next: 'height-weight',
  },

  // ─── HEIGHT & WEIGHT ──────────────────────────────────────
  'height-weight': {
    id: 'height-weight',
    type: 'form',
    title: "Nice to meet you, {firstName}. What's your height and weight?",
    fields: [
      { name: 'heightFeet', label: 'Feet', type: 'text', placeholder: "5", required: true, half: true },
      { name: 'heightInches', label: 'Inches', type: 'text', placeholder: "7", required: true, half: true },
      { name: 'weight', label: 'Weight (lbs)', type: 'text', placeholder: "165", required: true },
    ],
    required: true,
    // CONDITIONAL: BMI >= 25 → weight loss path, otherwise skip to health goals
    next: (data) => {
      const bmi = calculateBMI(data.heightFeet, data.heightInches, data.weight)
      return bmi !== null && bmi >= 25 ? 'weight-goal' : 'health-goals'
    },
  },

  // ─── WEIGHT LOSS GOAL (conditional: BMI >= 25) ────────────
  'weight-goal': {
    id: 'weight-goal',
    type: 'single-select',
    title: "Based on that, your current BMI falls within a range where weight management may help. What would be your weight goal?",
    options: [
      { label: 'Lose 10-20 lbs', value: '10-20' },
      { label: 'Lose 20-40 lbs', value: '20-40' },
      { label: 'Lose 40-60 lbs', value: '40-60' },
      { label: 'Lose 60+ lbs', value: '60+' },
      { label: "I'm not sure yet", value: 'unsure' },
    ],
    required: true,
    next: 'prior-weight-mgmt',
  },

  // ─── PRIOR WEIGHT MANAGEMENT (conditional: BMI >= 25) ─────
  'prior-weight-mgmt': {
    id: 'prior-weight-mgmt',
    type: 'multi-select',
    title: 'A GLP-1 medication may help you. What approaches have you tried before?',
    options: [
      { label: 'Diet changes', value: 'diet' },
      { label: 'Exercise programs', value: 'exercise' },
      { label: 'Weight loss supplements', value: 'supplements' },
      { label: 'Prescription medications', value: 'rx-meds' },
      { label: 'GLP-1 medications (Ozempic, Wegovy, etc.)', value: 'glp1' },
      { label: 'Bariatric surgery', value: 'surgery' },
      { label: 'None of the above', value: 'none' },
    ],
    next: (data) => {
      // If they've tried GLP-1, ask about their experience
      return data.priorWeightMgmt.includes('glp1') ? 'glp1-history' : 'health-goals'
    },
  },

  // ─── GLP-1 HISTORY (conditional: tried GLP-1 before) ───────
  'glp1-history': {
    id: 'glp1-history',
    type: 'multi-select',
    title: 'Which GLP-1 medications have you tried?',
    options: [
      { label: 'Semaglutide (Ozempic / Wegovy)', value: 'semaglutide' },
      { label: 'Tirzepatide (Mounjaro / Zepbound)', value: 'tirzepatide' },
      { label: 'Liraglutide (Saxenda / Victoza)', value: 'liraglutide' },
      { label: 'Dulaglutide (Trulicity)', value: 'dulaglutide' },
      { label: 'Other GLP-1 medication', value: 'other' },
    ],
    next: 'glp1-reactions',
  },

  // ─── GLP-1 REACTIONS (conditional: tried GLP-1) ───────────
  'glp1-reactions': {
    id: 'glp1-reactions',
    type: 'yes-no',
    title: 'Did you experience any adverse reactions to GLP-1 medications?',
    next: (data) => {
      return data.glp1Reactions === 'yes' ? 'glp1-reaction-details' : 'recent-weight-change'
    },
  },

  // ─── GLP-1 REACTION DETAILS (conditional: had reaction) ───
  'glp1-reaction-details': {
    id: 'glp1-reaction-details',
    type: 'text-input',
    title: 'Please describe the reactions you experienced.',
    placeholder: 'e.g., Severe nausea, vomiting, pancreatitis symptoms...',
    next: 'recent-weight-change',
  },

  // ─── RECENT WEIGHT CHANGE ────────────────────────────────
  'recent-weight-change': {
    id: 'recent-weight-change',
    type: 'yes-no',
    title: 'Have you experienced any recent significant weight changes?',
    next: (data) => {
      return data.recentWeightChange === 'yes' ? 'weight-loss-details' : 'medical-conditions'
    },
  },

  // ─── WEIGHT LOSS DETAILS (conditional: recent weight change)
  'weight-loss-details': {
    id: 'weight-loss-details',
    type: 'text-input',
    title: 'How much weight have you lost or gained recently?',
    placeholder: 'e.g., Lost 15 lbs in the last 3 months',
    next: 'medical-conditions',
  },

  // ─── HEALTH GOALS ─────────────────────────────────────────
  'health-goals': {
    id: 'health-goals',
    type: 'multi-select',
    title: 'What health goals would you like to work toward?',
    options: [
      { label: 'Lose weight and improve metabolic health', value: 'weight-loss', icon: '⚖️' },
      { label: 'Improve energy and longevity', value: 'energy-longevity', icon: '⚡' },
      { label: 'Support recovery and healing', value: 'recovery', icon: '🩹' },
      { label: 'Sleep better, feel calmer, and improve focus', value: 'sleep-focus', icon: '😴' },
      { label: 'Improve skin and hair health', value: 'skin-hair', icon: '✨' },
      { label: 'Improve sexual wellness', value: 'sexual-wellness', icon: '❤️' },
      { label: 'Support immune health', value: 'immune', icon: '🛡️' },
      { label: 'Other (please specify)', value: 'other', icon: '📝' },
    ],
    required: true,
    next: (data) => {
      // If they selected weight loss AND we came from the BMI>=25 path,
      // go to weight goal. Otherwise continue to medical conditions.
      // Actually per FigJam: health-goals → weight-change path only if BMI>=25 was handled earlier
      // The flow goes: health-goals → recent-weight-change → conditions
      // But if we already went through weight management (BMI>=25), skip to conditions
      const bmi = calculateBMI(data.heightFeet, data.heightInches, data.weight)
      if (bmi !== null && bmi >= 25) {
        // Already went through weight management path
        return 'recent-weight-change'
      }
      return 'recent-weight-change'
    },
  },

  // ─── MEDICAL CONDITIONS ───────────────────────────────────
  'medical-conditions': {
    id: 'medical-conditions',
    type: 'multi-select',
    title: 'Do you have any of these medical conditions?',
    subtitle: 'Select all that apply. This helps our provider tailor your care safely.',
    options: [
      { label: 'Pregnancy, breastfeeding, or plans to be pregnant in the next 3 months', value: 'pregnancy' },
      { label: 'Common or gallbladder disease', value: 'gallbladder' },
      { label: 'Pancreatitis', value: 'pancreatitis' },
      { label: 'Substance or alcohol-related disorders', value: 'substance' },
      { label: 'Gastroparesis or severe GI motility disorders', value: 'gastroparesis' },
      { label: 'Type 1 diabetes', value: 'type1-diabetes' },
      { label: 'Type 2 diabetes', value: 'type2-diabetes' },
      { label: 'Seizure disorder(s) or rare disease', value: 'seizure' },
      { label: 'Medullary thyroid cancer (MTC) or family history of MTC', value: 'mtc' },
      { label: 'Multiple Endocrine Neoplasia syndrome Type 2 (MEN 2)', value: 'men2' },
      { label: 'History of suicidal thoughts, self-harm, or mental health crisis', value: 'mental-health' },
      { label: 'Kidney disease', value: 'kidney' },
      { label: 'Severe heart, cancer, or the result of a family cancer history', value: 'heart-cancer' },
      { label: 'None of the above', value: 'none' },
    ],
    next: 'medications',
  },

  // ─── MEDICATIONS ──────────────────────────────────────────
  'medications': {
    id: 'medications',
    type: 'multi-select',
    title: 'What medications are you currently taking?',
    subtitle: "I'm asking so the provider can review interactions and make safe recommendations.",
    options: [
      { label: 'Insulin', value: 'insulin' },
      { label: 'Sulfonylureas or similar diabetes medicine that can cause low blood sugar', value: 'sulfonylureas' },
      { label: 'Metformin or another oral diabetes medication', value: 'metformin' },
      { label: 'Blood thinners such as warfarin', value: 'blood-thinners' },
      { label: 'Blood pressure medication', value: 'bp-meds' },
      { label: 'Steroid such as prednisone', value: 'steroids' },
      { label: 'Thyroid medications, and thyroid conditions', value: 'thyroid' },
      { label: 'Bipolar medications, anti-psychotics', value: 'psychiatric' },
      { label: 'Chronic pain medications', value: 'pain-meds' },
      { label: 'Seizure medication', value: 'seizure-meds' },
      { label: 'Organ transplant / immunosuppressant medications', value: 'immunosuppressant' },
      { label: 'Known medication interactions or allergies', value: 'known-interactions' },
      { label: 'Other (please specify)', value: 'other' },
      { label: 'None of the above', value: 'none' },
    ],
    next: 'diet',
  },

  // ─── LIFESTYLE: DIET ──────────────────────────────────────
  'diet': {
    id: 'diet',
    type: 'radio-chips',
    title: 'How would you describe your everyday diet?',
    options: [
      { label: 'Mostly balanced', value: 'balanced' },
      { label: 'Mostly unhealthy', value: 'unhealthy' },
      { label: 'Restrictive', value: 'restrictive' },
      { label: 'Other', value: 'other' },
    ],
    next: 'exercise',
  },

  // ─── LIFESTYLE: EXERCISE ──────────────────────────────────
  'exercise': {
    id: 'exercise',
    type: 'radio-chips',
    title: 'How often do you exercise?',
    options: [
      { label: 'Rarely or never', value: 'rarely' },
      { label: '1-2 times per week', value: '1-2' },
      { label: '3-4 times per week', value: '3-4' },
      { label: '5+ times per week', value: '5+' },
    ],
    next: 'sleep-quality',
  },

  // ─── LIFESTYLE: SLEEP QUALITY ─────────────────────────────
  'sleep-quality': {
    id: 'sleep-quality',
    type: 'radio-chips',
    title: 'How would you rate your sleep quality?',
    options: [
      { label: 'Poor', value: 'poor' },
      { label: 'Below average', value: 'below-average' },
      { label: 'Average', value: 'average' },
      { label: 'Good', value: 'good' },
      { label: 'Excellent', value: 'excellent' },
    ],
    next: 'sleep-hours',
  },

  // ─── LIFESTYLE: SLEEP HOURS ───────────────────────────────
  'sleep-hours': {
    id: 'sleep-hours',
    type: 'radio-chips',
    title: 'How many hours of sleep do you get on average?',
    options: [
      { label: 'Less than 5 hours', value: '<5' },
      { label: '5-6 hours', value: '5-6' },
      { label: '6-7 hours', value: '6-7' },
      { label: '7-8 hours', value: '7-8' },
      { label: '8+ hours', value: '8+' },
    ],
    next: 'stress',
  },

  // ─── LIFESTYLE: STRESS ────────────────────────────────────
  'stress': {
    id: 'stress',
    type: 'radio-chips',
    title: 'How would you describe your current stress level?',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Moderate', value: 'moderate' },
      { label: 'High', value: 'high' },
    ],
    next: (data) => {
      // CONDITIONAL: State determines visit type
      const requiresSync = SYNC_REQUIRED_STATES_SET.has(data.state)
      return requiresSync ? 'visit-type-sync' : 'visit-type-async'
    },
  },

  // ─── VISIT TYPE: ASYNC ────────────────────────────────────
  'visit-type-async': {
    id: 'visit-type-async',
    type: 'welcome', // Reuse welcome-style layout for this info screen
    title: "Thanks for sharing your information. Here, choose how you'd like to move forward.",
    subtitle: 'Based on your state, you qualify for an asynchronous review — no video visit needed.',
    next: 'desired-treatments',
  },

  // ─── VISIT TYPE: SYNC ─────────────────────────────────────
  'visit-type-sync': {
    id: 'visit-type-sync',
    type: 'calendar',
    title: 'How and when would you like to have your live consultation?',
    subtitle: 'Your state requires a video visit. Pick a date and time.',
    next: 'desired-treatments',
  },

  // ─── DESIRED TREATMENTS ───────────────────────────────────
  'desired-treatments': {
    id: 'desired-treatments',
    type: 'treatment-picker',
    title: 'Are there any specific treatments you\'d like to ask your provider about?',
    subtitle: "It's okay if nothing specific is in mind.",
    options: [
      { label: 'GHK-Cu', value: 'ghk-cu', description: 'Skin/hair repair & anti-aging' },
      { label: 'GLP-1', value: 'glp1', description: 'Weight loss (semaglutide, tirzepatide)' },
      { label: 'BPC-157', value: 'bpc-157', description: 'Gut healing & injury recovery' },
      { label: 'Glutathione', value: 'glutathione', description: 'Master antioxidant & detox' },
      { label: 'Tesamorelin', value: 'tesamorelin', description: 'Visceral fat reduction' },
      { label: 'NAD+', value: 'nad', description: 'Cellular energy & DNA repair' },
      { label: 'Sermorelin', value: 'sermorelin', description: 'GH-releasing hormone analog' },
    ],
    next: 'confirmation',
  },

  // ─── CONFIRMATION ─────────────────────────────────────────
  'confirmation': {
    id: 'confirmation',
    type: 'confirmation',
    title: "You're all set, {firstName}!",
    subtitle: 'A provider will review your information within 24-48 hours.',
    next: '', // Terminal step
  },
}

// ── STEP ORDER (for progress calculation) ────────────────────
// The "happy path" step count for progress bar calculation.
// Conditional steps are bonus — they don't inflate the progress bar.

export const MAIN_PATH_STEPS = [
  'get-started',
  'personal-info',
  'height-weight',
  'health-goals',
  'medical-conditions',
  'medications',
  'diet',
  'exercise',
  'sleep-quality',
  'sleep-hours',
  'stress',
  'desired-treatments',
  'confirmation',
]

/** Get the next step ID given current step and form data */
export function getNextStep(currentStepId: string, data: IntakeData): string | null {
  const step = INTAKE_STEPS[currentStepId]
  if (!step) return null

  if (typeof step.next === 'function') {
    return step.next(data)
  }
  return step.next || null
}

/** Check if a step's required fields are filled */
export function isStepComplete(stepId: string, data: IntakeData): boolean {
  const step = INTAKE_STEPS[stepId]
  if (!step) return false

  switch (stepId) {
    case 'personal-info':
      return !!(data.firstName && data.lastName && data.sex && data.dob && data.state && data.phone)
    case 'height-weight':
      return !!(data.heightFeet && data.weight)
    case 'weight-goal':
      return !!data.weightGoal
    case 'prior-weight-mgmt':
      return data.priorWeightMgmt.length > 0
    case 'health-goals':
      return data.healthGoals.length > 0
    case 'medical-conditions':
      return data.medicalConditions.length > 0
    case 'medications':
      return data.medications.length > 0
    case 'visit-type-sync':
      return !!(data.appointmentDate && data.appointmentTime)
    default:
      // Optional steps (exercise, sleep, stress, diet, text inputs)
      return true
  }
}

/** Calculate progress percentage based on visited steps */
export function getProgress(visitedSteps: string[]): number {
  // Count how many main-path steps have been visited
  const mainVisited = visitedSteps.filter((s) => MAIN_PATH_STEPS.includes(s)).length
  return Math.round((mainVisited / MAIN_PATH_STEPS.length) * 100)
}
