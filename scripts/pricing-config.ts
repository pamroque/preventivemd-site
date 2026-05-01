/**
 * pricing-config.ts — Single source of truth for the async catalog
 *
 * THIS IS THE FILE TO EDIT WHEN YOU WANT TO CHANGE PRICING.
 *
 * After editing, re-run the seed script:
 *   tsx scripts/seed-stripe-prices.ts
 *
 * The script will:
 *   1. Create new Stripe Prices in test mode (Stripe Prices are immutable)
 *   2. Update treatments.gateway_prices in Supabase to point to the new IDs
 *   3. Existing patient subscriptions keep their grandfathered prices
 *      until you migrate them (correct billing behavior — no surprises).
 *
 * Switching to live mode: re-run with STRIPE_SECRET_KEY=sk_live_... in env.
 * Live-mode Prices are independent of test-mode Prices; rerunning in live
 * mode creates a fresh set.
 */

// ─── Term ladder ─────────────────────────────────────────────────────────────
// Same terms apply to every (treatment, formulation) combination. Add a row
// to introduce a new term length; remove one to retire it.

export interface TermDefinition {
  id:             string  // stable identifier — appears in lookup keys
  label:          string  // human-readable, surfaced in UI
  amount_cents:   number  // total billed each cycle, in cents
  interval:       'month' | 'year'
  interval_count: number  // every N intervals
}

export const TERMS: TermDefinition[] = [
  { id: '1mo',  label: '1-month supply',  amount_cents: 14900,  interval: 'month', interval_count: 1 },
  { id: '3mo',  label: '3-month supply',  amount_cents: 41700,  interval: 'month', interval_count: 3 },
  { id: '6mo',  label: '6-month supply',  amount_cents: 77400,  interval: 'month', interval_count: 6 },
  { id: '12mo', label: '12-month supply', amount_cents: 118800, interval: 'year',  interval_count: 1 },
]


// ─── Formulations ────────────────────────────────────────────────────────────
// Add 'topical', 'sublingual', etc. when needed. Each (treatment, formulation)
// becomes its own Stripe Product with its own four Prices.

export interface FormulationDefinition {
  id:    string  // stable identifier — appears in lookup keys
  label: string  // surfaced in Stripe Product name and customer receipts
}

export const FORMULATIONS: FormulationDefinition[] = [
  { id: 'injection', label: 'Injection' },
  { id: 'oral',      label: 'Oral' },
]


// ─── Treatments ──────────────────────────────────────────────────────────────
// Slug must match what the questionnaire frontend stores in the cart.
// Display name appears in Stripe Product name and customer receipts.
//
// `formulations` lists which formulations are sold for this treatment. For
// templated v1 we offer both for everything; remove a formulation if a
// treatment doesn't actually have one (e.g., Sermorelin injection-only).

export interface TreatmentDefinition {
  slug:         string
  display_name: string
  formulations: string[]   // references FORMULATIONS[].id
  description?: string
}

export const TREATMENTS: TreatmentDefinition[] = [
  {
    slug:         'semaglutide',
    display_name: 'Semaglutide',
    formulations: ['injection', 'oral'],
    description:  'GLP-1 receptor agonist for weight management.',
  },
  {
    slug:         'tirzepatide',
    display_name: 'Tirzepatide',
    formulations: ['injection', 'oral'],
    description:  'Dual GIP/GLP-1 receptor agonist for weight management.',
  },
  {
    slug:         'ghk-cu',
    display_name: 'GHK-Copper',
    formulations: ['injection', 'oral'],
    description:  'Copper peptide supporting collagen production and tissue repair.',
  },
  {
    slug:         'nad-plus',
    display_name: 'NAD+',
    formulations: ['injection', 'oral'],
    description:  'Cellular energy and longevity support.',
  },
  {
    slug:         'sermorelin',
    display_name: 'Sermorelin',
    formulations: ['injection', 'oral'],
    description:  'Growth hormone-releasing peptide for vitality and recovery.',
  },
  {
    slug:         'glutathione',
    display_name: 'Glutathione',
    formulations: ['injection', 'oral'],
    description:  'Master antioxidant supporting detox and immune function.',
  },
]


// ─── Services ────────────────────────────────────────────────────────────────
// Non-treatment items: sync video consultation fee, future standalone
// lab panels, annual physicals, etc. Each service is one Stripe Product
// with one Price (one-time or recurring). The seed script writes to the
// service_pricing table (migration 009).

export interface ServiceDefinition {
  service_key:   string                  // stable id in code + Stripe metadata
  display_name:  string                  // shown on customer receipts
  description?:  string
  amount_cents:  number
  currency:      string                  // 'usd'
  type:          'one_time' | 'recurring'
}

export const SERVICES: ServiceDefinition[] = [
  {
    service_key:  'sync_visit',
    display_name: 'Sync Video Consultation',
    description:  '$35 video consultation with a licensed PreventiveMD provider',
    amount_cents: 3500,
    currency:     'usd',
    type:         'one_time',
  },
]

/** Stripe lookup key for a given service. Matches the convention used for
 *  treatment prices: stable string identifier mapped to a Price ID. */
export function serviceLookupKey(serviceKey: string): string {
  return `service_${serviceKey}`
}


// ─── Helpers ─────────────────────────────────────────────────────────────────
// Used by the seed script and by the API route's cart resolver.

/** Stripe Product name for a (treatment, formulation) pair. */
export function productName(t: TreatmentDefinition, formulationId: string): string {
  const f = FORMULATIONS.find(x => x.id === formulationId)
  return f ? `${t.display_name} (${f.label})` : t.display_name
}

/** Stable Stripe lookup key for a (treatment, formulation, term) triple. */
export function lookupKey(treatmentSlug: string, formulationId: string, termId: string): string {
  return `${treatmentSlug}_${formulationId}_${termId}`
}

/** All (treatment, formulation, term) combinations the catalog should produce. */
export function* allCombinations() {
  for (const t of TREATMENTS) {
    for (const formulationId of t.formulations) {
      for (const term of TERMS) {
        yield { treatment: t, formulationId, term }
      }
    }
  }
}
