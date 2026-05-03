// Content config for /treatments/[slug] marketing pages.
//
// One entry per treatment. All copy fields are placeholder TODOs that
// the clinical/marketing team should replace with reviewed text. The
// schema follows the agreed-upon outline (key details → summary →
// video → what is it / benefits → MOA → research → for whom → not
// for whom → what to expect → side effects → form factors → FAQs →
// how to get started). Sections render only if their data is non-
// empty, so during build-out empty arrays simply hide their sections.
//
// Form factors are derived from `treatment-forms.ts` for the canonical
// list; this file adds per-treatment guidance (dosage + how-to) for
// each offered form.

import type { MedForm } from './treatment-forms'

export type StatCard = {
  /** Short stat (e.g. "15%", "8 hrs", "1 in 3"). */
  value: string
  /** Plain-language description of what the stat represents. */
  label: string
}

export type EffectsPhase = {
  /** Time window label, e.g. "Weeks 1–4". */
  window: string
  /** Effects patients typically notice during this window. */
  effects: string[]
}

export type SafetyContent = {
  /** Brief paragraph framing the safety information. */
  intro: string
  /** Side effects most people may notice. */
  common: string[]
  /** Less common but more serious risks. */
  serious: string[]
  /** Closing prompt — defaults to "Tell your provider..." if omitted. */
  callToAction?: string
}

export type FormGuidance = {
  /** Plain-language dosage summary (e.g. typical range + titration). */
  dosage: string
  /** Step-by-step instructions for the patient on how to take it. */
  howTo:  string[]
}

export type Faq = {
  q: string
  a: string
}

export type TreatmentContent = {
  // ─── Identity ──────────────────────────────────────────────
  slug:             string
  /** Display name (without trademark). */
  name:             string
  /** Optional registered-trademark suffix (rendered raised + smaller). */
  trademark?:       '®'
  /** Lowest displayed monthly price across forms / plans, in USD. */
  startingAtPerMo:  number
  /** Hero product photo. */
  thumbnail:        string
  /** Optional pronunciation MP3 — falls back to SpeechSynthesis if absent. */
  audioSrc?:        string

  // ─── Hero summary ──────────────────────────────────────────
  /** 3–5 sentence overview displayed under the name in the hero. */
  summary: string

  // ─── Overview video ───────────────────────────────────────
  video: {
    /** Approximate length in minutes (used for the "[X]-min overview" label). */
    lengthMin: number
    /** Video source URL — leave undefined to render the placeholder card. */
    src?:      string
    /** Poster image — leave undefined to fall back to the thumbnail. */
    poster?:   string
  }

  // ─── What is it? + benefits / common reasons ──────────────
  whatIsIt: {
    paragraphs: string[]
    /** Benefits or common reasons patients explore this treatment. */
    benefits:   string[]
  }

  // ─── How it works (mechanism of action) ───────────────────
  howItWorks: {
    paragraphs: string[]
    /** Optional structured MOA steps; rendered as a numbered list. */
    steps?:     { title: string; description: string }[]
  }

  // ─── Results / what the research shows ────────────────────
  research: {
    paragraphs: string[]
    /** Headline stats from peer-reviewed research; rendered as cards. */
    stats:      StatCard[]
  }

  // ─── Who is it for? ───────────────────────────────────────
  forWhom: string[]

  // ─── Who is it NOT for? ───────────────────────────────────
  notForWhom: string[]

  // ─── What to expect — effects journey ─────────────────────
  expectations: EffectsPhase[]

  // ─── Side effects & safety ────────────────────────────────
  safety: SafetyContent

  // ─── Optional widgets ─────────────────────────────────────
  /** Renders the BMI calculator inside the Eligibility section. Most
   *  useful for weight-management treatments. */
  showBmiCalculator?: boolean

  // ─── Form factor guidance ─────────────────────────────────
  /** Per-form dosage summary + how-to steps. Keyed on the same
   *  MedForm IDs that treatment-forms.ts uses; only forms that
   *  PreventiveMD currently offers need entries. */
  formGuidance?: Partial<Record<MedForm, FormGuidance>>

  // ─── FAQs ─────────────────────────────────────────────────
  /** Frequently asked questions, rendered as a `<details>` accordion
   *  before the "Get started" block. */
  faqs?: Faq[]
}

const TODO = (note: string) => `[TODO: ${note}]`

export const treatmentContent: Record<string, TreatmentContent> = {
  semaglutide: {
    slug:            'semaglutide',
    name:            'Semaglutide',
    startingAtPerMo: 149,
    thumbnail:       '/assets/home/vial-generic.png',
    audioSrc:        '/assets/audio/semaglutide.mp3',
    showBmiCalculator: true,
    summary:         TODO('3–5 sentence summary of Semaglutide for patients (plain language; no medical claims yet).'),
    video: { lengthMin: 3 },
    whatIsIt: {
      paragraphs: [TODO('What is Semaglutide? 1–2 short paragraphs in plain language.')],
      benefits:   [TODO('Benefit / common reason 1'), TODO('Benefit / common reason 2'), TODO('Benefit / common reason 3')],
    },
    howItWorks: {
      paragraphs: [TODO('Mechanism of action explained simply (1 short paragraph).')],
      steps: [
        { title: TODO('MOA step 1 title'), description: TODO('MOA step 1 description') },
        { title: TODO('MOA step 2 title'), description: TODO('MOA step 2 description') },
        { title: TODO('MOA step 3 title'), description: TODO('MOA step 3 description') },
      ],
    },
    research: {
      paragraphs: [TODO('Research summary, with citations the clinical team approves.')],
      stats: [
        { value: '—', label: TODO('Headline finding 1') },
        { value: '—', label: TODO('Headline finding 2') },
        { value: '—', label: TODO('Headline finding 3') },
      ],
    },
    forWhom: [
      TODO('Eligibility criterion 1'),
      TODO('Eligibility criterion 2'),
      TODO('Eligibility criterion 3'),
    ],
    notForWhom: [
      TODO('Contraindication 1'),
      TODO('Contraindication 2'),
      TODO('Contraindication 3'),
    ],
    expectations: [
      { window: 'Weeks 1–4',  effects: [TODO('What patients typically experience in weeks 1–4')] },
      { window: 'Weeks 5–12', effects: [TODO('What patients typically experience in weeks 5–12')] },
      { window: 'Months 3+',  effects: [TODO('Maintenance phase expectations')] },
    ],
    safety: {
      intro:   TODO('1–2 sentence safety intro.'),
      common:  [TODO('Common side effect 1'), TODO('Common side effect 2')],
      serious: [TODO('Serious risk 1'), TODO('Serious risk 2')],
    },
    formGuidance: {
      injection: {
        dosage: TODO('Injection dosage and titration schedule, e.g. starting dose → target dose over X weeks'),
        howTo: [
          TODO('Step 1 — preparation (wash hands, inspect vial)'),
          TODO('Step 2 — site selection'),
          TODO('Step 3 — administration'),
          TODO('Step 4 — disposal and documentation'),
        ],
      },
      oral: {
        dosage: TODO('Oral dosage and titration schedule'),
        howTo: [
          TODO('Step 1 — when and how to take'),
          TODO('Step 2 — what to avoid before/after'),
          TODO('Step 3 — what to do if a dose is missed'),
        ],
      },
    },
    faqs: [
      { q: TODO('How fast will I see results?'),       a: TODO('Answer 1') },
      { q: TODO('Will I gain the weight back?'),       a: TODO('Answer 2') },
      { q: TODO('Do I need labs before starting?'),    a: TODO('Answer 3') },
      { q: TODO('What if I miss a dose?'),             a: TODO('Answer 4') },
    ],
  },

  tirzepatide: {
    slug:            'tirzepatide',
    name:            'Tirzepatide',
    startingAtPerMo: 199,
    thumbnail:       '/assets/home/vial-generic.png',
    audioSrc:        '/assets/audio/tirzepatide.mp3',
    showBmiCalculator: true,
    summary:         TODO('3–5 sentence summary of Tirzepatide for patients.'),
    video: { lengthMin: 3 },
    whatIsIt: {
      paragraphs: [TODO('What is Tirzepatide? 1–2 short paragraphs in plain language.')],
      benefits:   [TODO('Benefit / common reason 1'), TODO('Benefit / common reason 2'), TODO('Benefit / common reason 3')],
    },
    howItWorks: {
      paragraphs: [TODO('Mechanism of action (dual GLP-1 + GIP).')],
      steps: [
        { title: TODO('MOA step 1 title'), description: TODO('MOA step 1 description') },
        { title: TODO('MOA step 2 title'), description: TODO('MOA step 2 description') },
      ],
    },
    research: {
      paragraphs: [TODO('Research summary.')],
      stats: [
        { value: '—', label: TODO('Headline finding 1') },
        { value: '—', label: TODO('Headline finding 2') },
        { value: '—', label: TODO('Headline finding 3') },
      ],
    },
    forWhom:    [TODO('Criterion 1'), TODO('Criterion 2'), TODO('Criterion 3')],
    notForWhom: [TODO('Contraindication 1'), TODO('Contraindication 2'), TODO('Contraindication 3')],
    expectations: [
      { window: 'Weeks 1–4',  effects: [TODO('Weeks 1–4 effects')] },
      { window: 'Weeks 5–12', effects: [TODO('Weeks 5–12 effects')] },
      { window: 'Months 3+',  effects: [TODO('Months 3+ effects')] },
    ],
    safety: {
      intro:   TODO('Safety intro.'),
      common:  [TODO('Common side effect 1'), TODO('Common side effect 2')],
      serious: [TODO('Serious risk 1'), TODO('Serious risk 2')],
    },
    formGuidance: {
      injection: {
        dosage: TODO('Injection dosage and titration schedule'),
        howTo: [
          TODO('Step 1 — preparation'),
          TODO('Step 2 — site selection'),
          TODO('Step 3 — administration'),
          TODO('Step 4 — disposal'),
        ],
      },
      oral: {
        dosage: TODO('Oral dosage and titration schedule'),
        howTo: [
          TODO('Step 1 — when and how to take'),
          TODO('Step 2 — what to avoid before/after'),
          TODO('Step 3 — what to do if a dose is missed'),
        ],
      },
    },
    faqs: [
      { q: TODO('FAQ 1'), a: TODO('Answer 1') },
      { q: TODO('FAQ 2'), a: TODO('Answer 2') },
      { q: TODO('FAQ 3'), a: TODO('Answer 3') },
    ],
  },

  glutathione: {
    slug:            'glutathione',
    name:            'Glutathione',
    startingAtPerMo: 99,
    thumbnail:       '/assets/home/vial-generic.png',
    audioSrc:        '/assets/audio/glutathione.mp3',
    summary:         TODO('3–5 sentence summary of Glutathione.'),
    video: { lengthMin: 3 },
    whatIsIt: {
      paragraphs: [TODO('What is Glutathione?')],
      benefits:   [TODO('Benefit 1'), TODO('Benefit 2'), TODO('Benefit 3')],
    },
    howItWorks: {
      paragraphs: [TODO('How Glutathione works, plain-language MOA.')],
    },
    research: {
      paragraphs: [TODO('Research summary.')],
      stats: [
        { value: '—', label: TODO('Headline finding 1') },
        { value: '—', label: TODO('Headline finding 2') },
      ],
    },
    forWhom:    [TODO('Criterion 1'), TODO('Criterion 2')],
    notForWhom: [TODO('Contraindication 1'), TODO('Contraindication 2')],
    expectations: [
      { window: 'Weeks 1–4',  effects: [TODO('Weeks 1–4 effects')] },
      { window: 'Weeks 5–12', effects: [TODO('Weeks 5–12 effects')] },
    ],
    safety: {
      intro:   TODO('Safety intro.'),
      common:  [TODO('Common side effect 1')],
      serious: [TODO('Serious risk 1')],
    },
    formGuidance: {
      injection: {
        dosage: TODO('Injection dosage and frequency'),
        howTo: [
          TODO('Step 1 — preparation'),
          TODO('Step 2 — site selection'),
          TODO('Step 3 — administration'),
          TODO('Step 4 — disposal'),
        ],
      },
    },
    faqs: [
      { q: TODO('FAQ 1'), a: TODO('Answer 1') },
      { q: TODO('FAQ 2'), a: TODO('Answer 2') },
    ],
  },

  'ghk-cu': {
    slug:            'ghk-cu',
    name:            'GHK-Cu',
    startingAtPerMo: 99,
    thumbnail:       '/assets/home/ghk-cu.png',
    audioSrc:        '/assets/audio/ghk-cu.mp3',
    summary:         TODO('3–5 sentence summary of GHK-Cu.'),
    video: { lengthMin: 3 },
    whatIsIt: {
      paragraphs: [TODO('What is GHK-Cu?')],
      benefits:   [TODO('Benefit 1'), TODO('Benefit 2'), TODO('Benefit 3')],
    },
    howItWorks: {
      paragraphs: [TODO('How GHK-Cu works.')],
    },
    research: {
      paragraphs: [TODO('Research summary.')],
      stats: [
        { value: '—', label: TODO('Headline finding 1') },
        { value: '—', label: TODO('Headline finding 2') },
      ],
    },
    forWhom:    [TODO('Criterion 1'), TODO('Criterion 2')],
    notForWhom: [TODO('Contraindication 1'), TODO('Contraindication 2')],
    expectations: [
      { window: 'Weeks 1–4', effects: [TODO('Weeks 1–4 effects')] },
      { window: 'Weeks 5+',  effects: [TODO('Weeks 5+ effects')] },
    ],
    safety: {
      intro:   TODO('Safety intro.'),
      common:  [TODO('Common side effect 1')],
      serious: [TODO('Serious risk 1')],
    },
    formGuidance: {
      cream: {
        dosage: TODO('Cream dosage / amount per application'),
        howTo: [
          TODO('Step 1 — clean area'),
          TODO('Step 2 — apply'),
          TODO('Step 3 — wash hands after'),
        ],
      },
    },
    faqs: [
      { q: TODO('FAQ 1'), a: TODO('Answer 1') },
      { q: TODO('FAQ 2'), a: TODO('Answer 2') },
    ],
  },

  nad: {
    slug:            'nad',
    name:            'NAD+',
    startingAtPerMo: 99,
    thumbnail:       '/assets/home/vial-generic.png',
    audioSrc:        '/assets/audio/nad.mp3',
    summary:         TODO('3–5 sentence summary of NAD+.'),
    video: { lengthMin: 3 },
    whatIsIt: {
      paragraphs: [TODO('What is NAD+?')],
      benefits:   [TODO('Benefit 1'), TODO('Benefit 2'), TODO('Benefit 3')],
    },
    howItWorks: {
      paragraphs: [TODO('How NAD+ works.')],
    },
    research: {
      paragraphs: [TODO('Research summary.')],
      stats: [
        { value: '—', label: TODO('Headline finding 1') },
        { value: '—', label: TODO('Headline finding 2') },
      ],
    },
    forWhom:    [TODO('Criterion 1'), TODO('Criterion 2')],
    notForWhom: [TODO('Contraindication 1'), TODO('Contraindication 2')],
    expectations: [
      { window: 'Weeks 1–4', effects: [TODO('Weeks 1–4 effects')] },
      { window: 'Weeks 5+',  effects: [TODO('Weeks 5+ effects')] },
    ],
    safety: {
      intro:   TODO('Safety intro.'),
      common:  [TODO('Common side effect 1')],
      serious: [TODO('Serious risk 1')],
    },
    formGuidance: {
      injection: {
        dosage: TODO('NAD+ injection dosage and frequency'),
        howTo: [
          TODO('Step 1 — preparation'),
          TODO('Step 2 — site selection'),
          TODO('Step 3 — administration'),
          TODO('Step 4 — disposal'),
        ],
      },
    },
    faqs: [
      { q: TODO('FAQ 1'), a: TODO('Answer 1') },
      { q: TODO('FAQ 2'), a: TODO('Answer 2') },
    ],
  },

  sermorelin: {
    slug:            'sermorelin',
    name:            'Sermorelin',
    startingAtPerMo: 99,
    thumbnail:       '/assets/home/vial-generic.png',
    audioSrc:        '/assets/audio/sermorelin.mp3',
    summary:         TODO('3–5 sentence summary of Sermorelin.'),
    video: { lengthMin: 3 },
    whatIsIt: {
      paragraphs: [TODO('What is Sermorelin?')],
      benefits:   [TODO('Benefit 1'), TODO('Benefit 2'), TODO('Benefit 3')],
    },
    howItWorks: {
      paragraphs: [TODO('How Sermorelin works.')],
    },
    research: {
      paragraphs: [TODO('Research summary.')],
      stats: [
        { value: '—', label: TODO('Headline finding 1') },
        { value: '—', label: TODO('Headline finding 2') },
      ],
    },
    forWhom:    [TODO('Criterion 1'), TODO('Criterion 2')],
    notForWhom: [TODO('Contraindication 1'), TODO('Contraindication 2')],
    expectations: [
      { window: 'Weeks 1–4', effects: [TODO('Weeks 1–4 effects')] },
      { window: 'Weeks 5+',  effects: [TODO('Weeks 5+ effects')] },
    ],
    safety: {
      intro:   TODO('Safety intro.'),
      common:  [TODO('Common side effect 1')],
      serious: [TODO('Serious risk 1')],
    },
    formGuidance: {
      injection: {
        dosage: TODO('Sermorelin injection dosage and timing (typically nightly)'),
        howTo: [
          TODO('Step 1 — preparation'),
          TODO('Step 2 — site selection'),
          TODO('Step 3 — administration'),
          TODO('Step 4 — disposal'),
        ],
      },
    },
    faqs: [
      { q: TODO('FAQ 1'), a: TODO('Answer 1') },
      { q: TODO('FAQ 2'), a: TODO('Answer 2') },
    ],
  },
}

export function getAllTreatmentSlugs(): string[] {
  return Object.keys(treatmentContent)
}
