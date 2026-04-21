/*
 * assessment-types.ts — Types + step definitions for the intake form
 *
 * KEY CONCEPT: TypeScript types as your "contract"
 *
 * These types define what data each step collects.
 * When we add Supabase later, we'll add Zod schemas here too
 * for runtime validation (Zod derives TS types from schemas,
 * so types and validation stay in sync automatically).
 *
 * For now, we use plain TypeScript types + manual validation
 * in the form engine.
 */

// ── STEP DEFINITIONS ──────────────────────────────────────

export type StepType = 'basics' | 'textarea' | 'yesno' | 'sleep' | 'lifestyle' | 'payment' | 'schedule'

export type StepDef = {
  id: string
  type: StepType
  title: string
  subtitle: string
  hint?: string           // "Why we ask" box
  placeholder?: string    // For textarea steps
  detailsPlaceholder?: string  // For yesno → "Yes" details
}

export const STEPS: StepDef[] = [
  {
    id: 'basics',
    type: 'basics',
    title: "Let's get started",
    subtitle: "We'll use this information to prepare for your visit and send your results.",
  },
  {
    id: 'conditions',
    type: 'textarea',
    title: 'Current Medical Conditions',
    subtitle: 'Please list any medical conditions you have been diagnosed with.',
    placeholder: "e.g., Type 2 diabetes, hypertension, asthma — or 'None'",
  },
  {
    id: 'medications',
    type: 'textarea',
    title: 'Current Active Medications',
    subtitle: 'List all medications and supplements you currently take.',
    placeholder: "e.g., Metformin 500mg, Vitamin D 2000 IU, Aspirin 81mg — or 'None'",
  },
  {
    id: 'allergies',
    type: 'textarea',
    title: 'Allergies',
    subtitle: 'Do you have any known allergies to medications, foods, or other substances?',
    placeholder: "e.g., Penicillin, shellfish, latex — or 'None known'",
  },
  {
    id: 'cancer',
    type: 'yesno',
    title: 'Cancer History',
    subtitle: 'Have you or a close family member had cancer?',
    hint: 'Peptides promote growth and repair, so we take extra care with active or high-risk cancer histories.',
    detailsPlaceholder: 'e.g., Personal: none. Mother had breast cancer (2015, in remission)',
  },
  {
    id: 'hormones',
    type: 'yesno',
    title: 'Hormone Issues',
    subtitle: 'Do you have any thyroid, pituitary, or adrenal problems?',
    hint: 'Some peptides influence hormone pathways, so we coordinate carefully to keep your levels balanced.',
    detailsPlaceholder: "e.g., Hashimoto's thyroiditis, on levothyroxine",
  },
  {
    id: 'autoimmune',
    type: 'yesno',
    title: 'Autoimmune Conditions',
    subtitle: 'Do you have any autoimmune conditions such as lupus, MS, or rheumatoid arthritis?',
    hint: 'Peptides can modulate the immune system — they may help, but some conditions need extra monitoring.',
    detailsPlaceholder: 'e.g., Rheumatoid arthritis, on methotrexate',
  },
  {
    id: 'heart',
    type: 'yesno',
    title: 'Heart, Kidney & Liver Health',
    subtitle: 'Have you been diagnosed with any heart, kidney, or liver conditions — or do you take medications for these?',
    hint: "Understanding these ensures safe dosing and that your organs won't be put under undue strain.",
    detailsPlaceholder: 'e.g., Stage 2 hypertension, on lisinopril',
  },
  {
    id: 'pregnancy',
    type: 'yesno',
    title: 'Pregnancy & Breastfeeding',
    subtitle: 'Are you currently pregnant, breastfeeding, or actively planning to become pregnant?',
    hint: "Peptide therapy has not been studied in these groups — your safety and your baby's safety come first.",
    detailsPlaceholder: 'Please share any relevant details',
  },
  {
    id: 'sleep',
    type: 'sleep',
    title: 'Sleep & Stress',
    subtitle: 'Help us understand your current sleep quality and stress levels.',
    hint: 'This helps us identify the right peptides — for example, DSIP is particularly effective for sleep support.',
  },
  {
    id: 'injuries',
    type: 'yesno',
    title: 'Injuries, Gut & Skin',
    subtitle: 'Do you have any recent injuries, ongoing digestive issues, or skin problems?',
    hint: 'Peptides like BPC-157 are excellent for targeted healing in these areas — knowing your issues helps us match you.',
    detailsPlaceholder: 'e.g., Torn ACL (6 months ago), chronic IBS, eczema',
  },
  {
    id: 'interactions',
    type: 'yesno',
    title: 'Medication Interactions',
    subtitle: 'Are you taking blood thinners, diabetes medications, or immunosuppressants?',
    hint: "Certain drug classes can interact with peptides. We'll review and adjust your protocol — or refer you — as needed.",
    detailsPlaceholder: 'e.g., Warfarin 5mg daily, Humira every 2 weeks',
  },
  {
    id: 'lifestyle',
    type: 'lifestyle',
    title: 'Your Lifestyle',
    subtitle: 'Tell us about your day-to-day habits.',
    hint: 'Peptides work best with healthy habits — like high-octane fuel in a well-maintained engine.',
  },
  {
    id: 'goals',
    type: 'textarea',
    title: 'Your Goals',
    subtitle: 'What do you most hope to achieve with peptide therapy?',
    placeholder: 'e.g., More energy, better sleep, faster recovery, reduced joint pain, improved body composition...',
    hint: 'This is the heart of your personalized plan — there are no wrong answers.',
  },
  {
    id: 'payment',
    type: 'payment',
    title: 'Reserve Your Visit',
    subtitle: '$35 secures your 20-minute consultation with a licensed physician. Your personalized protocol — and any medication — is built from there.',
  },
  {
    id: 'schedule',
    type: 'schedule',
    title: 'Choose Your Visit Time',
    subtitle: 'Pick a day and time that works for you. Your chart will be fully reviewed before your physician joins.',
  },
]

// ── FORM DATA TYPE ──────────────────────────────────────
// Shape of ALL answers across all steps.

export type BasicsData = {
  email: string
  name: string
  phone: string
  dob: string
}

export type YesNoData = {
  answer?: 'yes' | 'no'
  details?: string
}

export type SleepData = {
  hours?: string
  quality?: string
  stress?: string
}

export type LifestyleData = {
  diet?: string
  exercise?: string
  smoking?: string
  alcohol?: string
}

export type ScheduleData = {
  day: string
  slot: string
}

export type AssessmentData = {
  basics: BasicsData
  conditions: string
  medications: string
  allergies: string
  goals: string
  cancer: YesNoData
  hormones: YesNoData
  autoimmune: YesNoData
  heart: YesNoData
  pregnancy: YesNoData
  injuries: YesNoData
  interactions: YesNoData
  sleep: SleepData
  lifestyle: LifestyleData
  schedule: ScheduleData
}

// ── HELPERS ──────────────────────────────────────

/** Get the next N business days starting from tomorrow */
export function getBusinessDays(count: number): Date[] {
  const result: Date[] = []
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (result.length < count) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      result.push(new Date(d))
    }
    d.setDate(d.getDate() + 1)
  }
  return result
}

/** Infer a care pathway from goals + conditions text */
export function getPathway(goals: string, conditions: string): string {
  const all = `${goals} ${conditions}`.toLowerCase()
  if (/weight|fat|metabol|obese|semaglutide|tirzepatide|glp/.test(all)) return 'Weight Management'
  if (/pain|injur|tendon|ligament|recover|gut|ibs|digest|surgery/.test(all)) return 'Sports Medicine & Recovery'
  if (/brain|cogni|memory|focus|fog|mental|concentration/.test(all)) return 'Brain Health & Cognitive'
  if (/sexual|libido|erect|arousal/.test(all)) return 'Sexual Wellness'
  if (/sleep|insomnia|circadian|restless/.test(all)) return 'Sleep & Circadian Health'
  if (/immune|infect|virus|autoimmune/.test(all)) return 'Immune Support & Resilience'
  return 'Longevity & Preventive Medicine'
}

/** Available time slots */
export const TIME_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM',
  '3:00 PM', '4:00 PM', '5:00 PM',
]
