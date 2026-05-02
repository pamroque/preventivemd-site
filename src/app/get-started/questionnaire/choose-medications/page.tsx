'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import DisqualificationGate from '@/components/ui/DisqualificationGate'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'
import { usePricingCatalog, lookupPriceCents } from '@/lib/pricing/usePricingCatalog'

// Maps the questionnaire-level treatment ID to the canonical slug used in
// the pricing catalog (and Stripe). 'glp-1' splits into one of five
// sub-options based on the patient's choice; other IDs map 1:1.
//
// `semaglutide` and `tirzepatide` are the compounded options and have
// pricing rows in the catalog. The branded options (`foundayo`,
// `wegovy`, `zepbound`) are fulfilled through external pharmacy
// partners and don't (yet) have pricing rows here — `lookupPriceCents`
// will return null for those, which the cart treats as 0.
function resolveCatalogSlug(treatmentId: string, choiceType: string | null): string {
  if (treatmentId === 'glp-1') {
    if (choiceType && GLP1_TYPE_IDS.includes(choiceType as Glp1Type)) {
      return choiceType
    }
    return 'semaglutide' // safe fallback before a type is picked
  }
  return treatmentId
}

const QUESTION_TEXT = 'Next, please specify your medication preferences.'

// ─── Assets ──────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'

// ─── Icons ───────────────────────────────────────────────────────────────────

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 shrink-0" aria-hidden="true">
      <path fillRule="evenodd"
        d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd" />
    </svg>
  )
}

function CheckFilledIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 shrink-0 text-brand-mint" aria-hidden="true">
      <path fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Data ────────────────────────────────────────────────────────────────────

const TREATMENT_NAMES: Record<string, string> = {
  'ghk-cu': 'GHK-Cu',
  'glp-1': 'GLP-1',
  'glutathione': 'Glutathione',
  'nad-plus': 'NAD+',
  'sermorelin': 'Sermorelin',
}

// GLP-1 type options. Compounded options (semaglutide, tirzepatide) flow
// through our pharmacy partners and need form + plan choices to be made.
// Branded options (Foundayo®, Wegovy®, Zepbound®) are fulfilled through
// the manufacturer's direct pharmacy program — no form/plan picker for
// now (TBD what UI follows when a branded type is selected).
const GLP1_TYPES = [
  { id: 'semaglutide', label: 'Semaglutide',  sub: 'Starting at $149/mo' },
  { id: 'tirzepatide', label: 'Tirzepatide',  sub: 'Starting at $199/mo' },
  { id: 'foundayo',    label: 'Foundayo®',    sub: 'Starting at $149/mo' },
  { id: 'wegovy',      label: 'Wegovy®',      sub: 'Starting at $149/mo' },
  { id: 'zepbound',    label: 'Zepbound®',    sub: 'Starting at $299/mo' },
] as const

const GLP1_TYPE_IDS: ReadonlyArray<string> = GLP1_TYPES.map((t) => t.id)

// The compounded subset that uses our internal form + plan pickers.
const COMPOUNDED_GLP1_TYPES: ReadonlySet<string> = new Set(['semaglutide', 'tirzepatide'])

function isCompoundedGlp1(type: string | null | undefined): boolean {
  return !!type && COMPOUNDED_GLP1_TYPES.has(type)
}

// Manufacturer pricing pages for the branded GLP-1 options. Linked from
// the dose-pricing footnote that appears after the patient picks a
// branded type on Foundayo® / Wegovy® / Zepbound® — the price they pay
// is set by the manufacturer, not by us, so we send them to the source
// of truth.
const BRANDED_GLP1_OFFICIAL_URLS: Record<string, string> = {
  zepbound: 'https://www.lilly.com/lillydirect/medicines/zepbound',
  wegovy:   'https://www.novocare.com/pharmacy/wegovy.html',
  foundayo: 'https://www.lilly.com/lillydirect/medicines/foundayo',
}

// Pharmacy partner names that fulfill each branded GLP-1. Used by the
// footnote so the disclaimer references the correct manufacturer.
const BRANDED_GLP1_PARTNERS: Record<string, string> = {
  wegovy:   'NovoCare®',
  zepbound: 'LillyDirect®',
  foundayo: 'LillyDirect®',
}

// "Starting at" monthly price (in dollars) per branded type + form
// factor. Surfaced on the Prescription plan card after the patient picks
// a form factor. Numbers ought to track manufacturer-published pricing;
// keep in lockstep with the corresponding marketing pages.
const BRANDED_GLP1_STARTING_PRICES: Record<string, Partial<Record<MedForm, number>>> = {
  foundayo: { oral: 149 },
  wegovy:   { pen: 199, oral: 149 },
  zepbound: { injection: 299, kwikpen: 299 },
}

function getBrandedStartingPrice(type: string | null | undefined, form: MedForm | null | undefined): number | null {
  if (!type || !form) return null
  return BRANDED_GLP1_STARTING_PRICES[type]?.[form] ?? null
}

// ─── Form factors ─────────────────────────────────────────────────────────────
//
// Each medication has its own list of "How would you like to take it?"
// options. Treatments with a single option (e.g., GHK-Cu = Cream,
// Foundayo® = Pills) auto-select that option so the patient sees the
// form pre-selected — see the auto-select effect on mount and the
// type-change branch in `setChoice`.
//
// Form IDs are also used as catalog formulation keys for pricing
// lookups; rows that don't exist in the catalog (e.g., 'cream',
// 'kwikpen', 'pen') simply return null and contribute 0 to the cart.

type MedForm = 'injection' | 'oral' | 'kwikpen' | 'pen' | 'cream'

interface FormOption {
  id:    MedForm
  label: string
  // ReactNode rather than `string` so a sub can include inline markup
  // — e.g., the branded form factors append a superscript dagger that
  // ties to the price footnote.
  sub?:  React.ReactNode
}

const FORM_LABELS: Record<MedForm, string> = {
  injection: 'Injection vials',
  oral:      'Pills',
  kwikpen:   'KwikPen®',
  pen:       'Injection pens',
  cream:     'Cream',
}

// Per-treatment form options (non-GLP-1).
const FORM_OPTIONS_BY_TREATMENT: Record<string, FormOption[]> = {
  'ghk-cu':      [{ id: 'cream',     label: 'Cream',           sub: 'Once or twice daily' }],
  'sermorelin':  [{ id: 'injection', label: 'Injection vials', sub: 'Once weekly' }],
  'glutathione': [{ id: 'injection', label: 'Injection vials', sub: 'Once weekly' }],
  'nad-plus':    [{ id: 'injection', label: 'Injection vials', sub: 'Once weekly' }],
}

// Per-GLP-1-type form options. Sub-labels follow the form-factor type:
// Injection vials, KwikPen®, and Injection pens → Once weekly;
// Pills → Once daily.
const GLP1_FORM_OPTIONS_BY_TYPE: Record<Glp1Type, FormOption[]> = {
  semaglutide: [
    { id: 'injection', label: 'Injection vials', sub: 'Once weekly' },
    { id: 'oral',      label: 'Pills',           sub: 'Once daily' },
  ],
  tirzepatide: [
    { id: 'injection', label: 'Injection vials', sub: 'Once weekly' },
    { id: 'oral',      label: 'Pills',           sub: 'Once daily' },
  ],
  // Branded form-factor cards show frequency only; the per-form
  // "Starting at $X" price now lives on the Prescription plan card via
  // BRANDED_GLP1_STARTING_PRICES below.
  foundayo: [
    { id: 'oral',      label: 'Pills',           sub: 'Once daily' },
  ],
  wegovy: [
    { id: 'pen',       label: 'Injection pens',  sub: 'Once weekly' },
    { id: 'oral',      label: 'Pills',           sub: 'Once daily' },
  ],
  zepbound: [
    { id: 'injection', label: 'Injection vials', sub: 'Once weekly' },
    { id: 'kwikpen',   label: 'KwikPen®',        sub: 'Once weekly' },
  ],
}

function getFormOptions(treatmentId: string, glp1Type: Glp1Type | null): FormOption[] {
  if (treatmentId === 'glp-1') {
    return glp1Type ? GLP1_FORM_OPTIONS_BY_TYPE[glp1Type] : []
  }
  return FORM_OPTIONS_BY_TREATMENT[treatmentId] ?? []
}

// Plan definitions are now structural only — no prices. Prices come from
// /api/treatments/pricing (which reads from payment_gateway_prices).
// `monthsCovered` is used to compute per-month effective price and savings
// vs. the 1mo baseline at render time.
const PLAN_DEFS = [
  { id: '1mo',  label: '1-month supply',   monthsCovered: 1,  tag: null               },
  { id: '3mo',  label: '3-month supply',   monthsCovered: 3,  tag: 'Most Popular'     },
  // Labels are bare; the PlanRow appends a superscript dagger for plans
  // whose `monthsCovered` exceeds the 3-month-shipment threshold (i.e.,
  // the ones the footnote applies to).
  { id: '6mo',  label: '6-month supply',   monthsCovered: 6,  tag: null               },
  { id: '12mo', label: '12-month supply',  monthsCovered: 12, tag: 'Best Value'       },
] as const

// ─── Types ────────────────────────────────────────────────────────────────────

type Glp1Type = 'semaglutide' | 'tirzepatide' | 'foundayo' | 'wegovy' | 'zepbound'
type MedPlan = '1mo' | '3mo' | '6mo' | '12mo'

interface MedChoice {
  type: Glp1Type | null
  form: MedForm | null
  plan: MedPlan | null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-sm font-medium text-[rgba(0,0,0,0.87)]">
      {children} <span className="text-[#b91c1c]" aria-hidden="true">*</span>
      <span className="sr-only">(required)</span>
    </p>
  )
}

function MedOptionCard({
  isSelected,
  onClick,
  label,
  sub,
}: {
  isSelected: boolean
  onClick: () => void
  label: string
  sub?: React.ReactNode
}) {
  return (
    <div
      className="flex-1"
      style={isSelected ? {
        padding: 2,
        background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-mint) 100%)',
        borderRadius: 10,
      } : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className={`w-full flex flex-col items-start gap-1 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1 ${
          isSelected
            ? 'rounded-[8px] bg-white'
            : 'rounded-lg border border-[#e3e3e3] bg-white hover:border-brand-blue/40'
        }`}
      >
        <span className={`text-[18px] font-medium leading-7 ${isSelected ? 'text-brand-blue' : 'text-[rgba(0,0,0,0.87)]'}`}>
          {label}
        </span>
        {sub && (
          <span className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
            {sub}
          </span>
        )}
      </button>
    </div>
  )
}

interface PlanRowProps {
  def:               typeof PLAN_DEFS[number]
  isSelected:        boolean
  onClick:           () => void
  priceCents:        number | null   // null while catalog loads
  oneMonthCents:     number | null   // for computing per-month effective + savings
}

function PlanRow({ def, isSelected, onClick, priceCents, oneMonthCents }: PlanRowProps) {
  // Derive display values from cents amounts. Per-month effective only
  // shown for multi-month terms; savings badge only when there's actual
  // savings vs. paying month-by-month.
  const totalDollars      = priceCents != null ? priceCents / 100 : null
  const perMonthDollars   = (priceCents != null && def.monthsCovered > 1)
                              ? Math.round((priceCents / def.monthsCovered) / 100)
                              : null
  const savingsCents      = (priceCents != null && oneMonthCents != null && def.monthsCovered > 1)
                              ? (oneMonthCents * def.monthsCovered) - priceCents
                              : 0
  const savingsDollars    = savingsCents > 0 ? Math.round(savingsCents / 100) : 0

  return (
    <div
      style={isSelected ? {
        padding: 2,
        background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-mint) 100%)',
        borderRadius: 10,
      } : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className={`w-full flex flex-col gap-1 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1 ${
          isSelected
            ? 'rounded-[8px] bg-white'
            : 'rounded-lg border border-[#e3e3e3] bg-white hover:border-brand-blue/40'
        }`}
      >
        {/* Supply label + optional inline tag */}
        <div className="flex items-center gap-2">
          <span className={`text-base font-normal leading-6 ${isSelected ? 'text-brand-blue' : 'text-[rgba(0,0,0,0.87)]'}`}>
            {def.label}
            {def.monthsCovered > 3 && <sup>†</sup>}
          </span>
          {def.tag && (
            <span className="text-[12px] font-semibold tracking-[1.5px] uppercase text-brand-teal">
              {def.tag}
            </span>
          )}
        </div>

        {/* Price row */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[24px] font-normal leading-8 text-[rgba(0,0,0,0.87)]">
              {totalDollars != null ? `$${totalDollars.toLocaleString()}` : '—'}
            </span>
            {perMonthDollars != null && (
              <span className="text-sm text-[rgba(0,0,0,0.6)]">
                (${perMonthDollars}/mo)
              </span>
            )}
          </div>
          {savingsDollars > 0 && (
            <span className="text-xs font-normal text-[#047857] bg-[#d1fae5] px-1.5 py-1 rounded-xl">
              SAVE ${savingsDollars.toLocaleString()}
            </span>
          )}
        </div>
      </button>
    </div>
  )
}

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 90

// ─── Routes ──────────────────────────────────────────────────────────────────

const NEXT_STEP = '/get-started/questionnaire/checkout'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ChooseMedicationsPage() {
  const router = useRouter()
  const [treatments, setTreatments] = useState<string[]>([])
  const [choices, setChoices] = useState<Record<string, MedChoice>>({})
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, { type?: boolean; form?: boolean; plan?: boolean }>>({})
  const [loaded, setLoaded] = useState(false)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const stickyCtaRef = useRef<HTMLDivElement>(null)
  const [stickyCtaHeight, setStickyCtaHeight] = useState(140)

  // Live price catalog from /api/treatments/pricing — replaces any
  // hardcoded PLAN_PRICES. Falls back to '—' in the UI while loading.
  const { catalog: pricingCatalog } = usePricingCatalog()

  useEffect(() => {
    const el = stickyCtaRef.current
    if (!el) return
    const update = () => setStickyCtaHeight(el.getBoundingClientRect().height)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (loaded && treatments.length === 0) {
      router.replace('/get-started/questionnaire/choose-treatments')
    }
  }, [loaded, treatments, router])

  useEffect(() => {
    const step12 = getStepValues(12)
    let ids: string[] = []
    if (typeof step12.treatments === 'string') {
      try { ids = JSON.parse(step12.treatments) } catch { /* ignore */ }
    }
    // The choose-treatments / desired-treatments page now saves IDs in
    // the order the patient actually saw them on the screen (pre-checked
    // first, then goal-matched, then alphabetical). Preserve that order
    // here instead of imposing our own — keeps the two pages in sync.
    setTreatments(ids)

    const initial: Record<string, MedChoice> = {}
    ids.forEach(id => { initial[id] = { type: null, form: null, plan: null } })

    const step13 = getStepValues(13)
    if (typeof step13.choices === 'string') {
      try {
        const saved = JSON.parse(step13.choices) as Record<string, MedChoice>
        Object.assign(initial, saved)
      } catch { /* ignore */ }
    }

    // Reconcile saved `form` against the current options (which can shift
    // when treatment data is updated, e.g., GHK-Cu now offers `cream`
    // only). If the saved form is no longer valid, drop it.
    // Then auto-select for any treatment whose current type produces a
    // single form option (covers GHK-Cu / Sermorelin / Glutathione /
    // NAD+ on mount, and Foundayo as soon as a saved type is loaded).
    ids.forEach(id => {
      const c = initial[id]
      if (!c) return
      const opts = getFormOptions(id, c.type)
      const validIds = new Set(opts.map(o => o.id))
      if (c.form && !validIds.has(c.form)) {
        c.form = null
      }
      if (!c.form && opts.length === 1) {
        c.form = opts[0].id
      }
      // Mirror the setChoice rule: branded GLP-1 with a form set always
      // sits on the 1-month plan.
      if (id === 'glp-1' && c.form && !isCompoundedGlp1(c.type)) {
        c.plan = '1mo'
      }
    })

    setChoices(initial)

    const prior = getPriorSteps(13)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({
        ...last,
        editHref: '/get-started/questionnaire/choose-treatments',
      })
    }
    setLoaded(true)
  }, [])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  function removeTreatment(id: string) {
    const nextTreatments = treatments.filter(t => t !== id)
    setTreatments(nextTreatments)
    setChoices(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    // Persist the removal to step 12 so /choose-treatments (the previous
    // step) reflects it when the user navigates back. Without this, the
    // saved treatments list at step 12 would still include the removed
    // medication and the picker would re-pre-select it. We rebuild the
    // chat-history bubbles from `nextTreatments` for the same reason.
    const newBubbles = nextTreatments.map(tid => TREATMENT_NAMES[tid] ?? tid)
    saveStep(
      12,
      {
        question: currentStep?.question ?? 'Which treatments would you like to request? *',
        bubbles: newBubbles,
      },
      { treatments: JSON.stringify(nextTreatments) },
    )
  }

  function setChoice<K extends keyof MedChoice>(treatmentId: string, field: K, value: MedChoice[K]) {
    setChoices(prev => {
      const nextChoice: MedChoice = { ...prev[treatmentId], [field]: value }
      // GLP-1 type changes invalidate the previous form + plan because
      // each type carries its own form factors. Clear both, then
      // auto-select form when the new type has a single option (e.g.,
      // Foundayo® → Pills).
      if (treatmentId === 'glp-1' && field === 'type') {
        nextChoice.form = null
        nextChoice.plan = null
        const opts = getFormOptions('glp-1', value as Glp1Type)
        if (opts.length === 1) {
          nextChoice.form = opts[0].id
        }
      }
      // Branded GLP-1 only offers a 1-month plan; auto-select it as
      // soon as a form factor is set so the price card renders fully
      // populated. Clears when the form is unset (shouldn't happen via
      // the UI, but stays correct if it does).
      if (treatmentId === 'glp-1' && !isCompoundedGlp1(nextChoice.type)) {
        nextChoice.plan = nextChoice.form ? '1mo' : null
      }
      return { ...prev, [treatmentId]: nextChoice }
    })
    setFieldErrors(prev => {
      if (!prev[treatmentId]?.[field]) return prev
      const updated = { ...prev[treatmentId] }
      delete updated[field as keyof typeof updated]
      if (Object.keys(updated).length === 0) {
        const { [treatmentId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [treatmentId]: updated }
    })
  }

  const isComplete =
    treatments.length > 0 &&
    treatments.every(id => {
      const c = choices[id]
      if (!c) return false
      if (id === 'glp-1' && !c.type) return false
      // Form + plan are required for every visible picker.
      // For branded GLP-1, plan ('1mo') is auto-set as soon as form is
      // set, so the same plan check covers both compounded and branded.
      return !!c.form && !!c.plan
    })

  // Sum the cart in cents from the live catalog. If the catalog hasn't
  // loaded yet (or some combo is missing), the entry contributes 0.
  // Display side renders cents → dollars where shown.
  const dueTodayCents = treatments.reduce((sum, id) => {
    const c = choices[id]
    if (!c?.form || !c?.plan) return sum
    const slug = resolveCatalogSlug(id, c.type)
    const cents = lookupPriceCents(pricingCatalog, slug, c.form, c.plan)
    return sum + (cents ?? 0)
  }, 0)
  const dueToday = Math.round(dueTodayCents / 100)

  function handleContinue() {
    if (isNavigating) return
    const errors: Record<string, { type?: boolean; form?: boolean; plan?: boolean }> = {}
    treatments.forEach(id => {
      const c = choices[id]
      const err: { type?: boolean; form?: boolean; plan?: boolean } = {}
      if (id === 'glp-1' && !c?.type) err.type = true
      // Form is required for every visible "How would you like to take
      // it?" picker — that's all non-GLP-1 treatments and any GLP-1
      // selection that has a type picked. (Branded types may have it
      // auto-selected, in which case it's already truthy.) Plan only
      // applies to non-GLP-1 and compounded GLP-1; branded GLP-1 skips
      // the plan picker.
      const formVisible = id !== 'glp-1' || !!c?.type
      if (formVisible && !c?.form) err.form = true
      // Plan is visible: always for non-GLP-1; for compounded GLP-1
      // once a type is picked; for branded GLP-1 once a form is picked
      // (plan auto-selects to '1mo' at that point).
      const planVisible = id !== 'glp-1'
        || (!!c?.type && (isCompoundedGlp1(c?.type) || !!c?.form))
      if (planVisible && !c?.plan) err.plan = true
      if (Object.keys(err).length > 0) errors[id] = err
    })
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      // Scroll to the first unfilled required field
      for (const id of treatments) {
        if (!errors[id]) continue
        const fields = (id === 'glp-1' ? ['type', 'form', 'plan'] : ['form', 'plan']) as ('type' | 'form' | 'plan')[]
        for (const field of fields) {
          if (errors[id]?.[field]) {
            sectionRefs.current.get(`${id}-${field}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            break
          }
        }
        break
      }
      return
    }
    setFieldErrors({})
    setIsNavigating(true)
    const bubbles = treatments.map(id => {
      const c = choices[id]
      let name: string
      if (id === 'glp-1' && c?.type) {
        const opt = GLP1_TYPES.find(t => t.id === c.type)
        name = opt?.label ?? TREATMENT_NAMES[id] ?? id
      } else {
        name = TREATMENT_NAMES[id] ?? id
      }
      const formLabel = c?.form ? FORM_LABELS[c.form] : ''
      const plan = c?.plan ?? ''
      return `${name} · ${formLabel} · ${plan}`
    })
    saveStep(
      13,
      { question: QUESTION_TEXT, bubbles },
      { choices: JSON.stringify(choices) }
    )
    router.push(NEXT_STEP)
  }

  return (
    <>
      <DisqualificationGate />
      <BackHeader backHref="/get-started/questionnaire/choose-treatments" progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className={`overflow-y-auto bg-white focus:outline-none ${done ? 'pb-[calc(var(--cta-h)-8px)] md:pb-[calc(var(--cta-h)+32px)]' : 'pb-8'}`}
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          ['--cta-h' as string]: `${stickyCtaHeight}px`,
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[560px] md:px-0 flex flex-col gap-6 md:gap-9 pt-6 md:pt-9">

          <ChatHistory
            historicSteps={[]}
            currentStep={currentStep}
            animateCurrentStep={animateBubbles}
          />

          {/* ── Eve's message ── */}
          <div className="flex items-start gap-3 w-full">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
                aria-live="polite"
                aria-label={QUESTION_TEXT}
              >
                {typingStarted && (
                  <>
                    {words.slice(0, visibleWords).map((word, i) => (
                      <span key={i}>
                        {word}
                        {i < visibleWords - 1 ? ' ' : ''}
                      </span>
                    ))}
                    {visibleWords < words.length && (
                      <span
                        className="inline-block w-[2px] h-[1em] bg-current align-middle ml-[1px] animate-pulse"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </h1>
            </div>
          </div>

          {/* ── Medication sections ── */}
          {done && (
            <div className="flex flex-col gap-12 animate-[fadeIn_0.4s_ease_forwards]">
              {treatments.map((tid) => {
                  const choice = choices[tid] ?? { type: null, form: null, plan: null }
                  const name = TREATMENT_NAMES[tid] ?? tid

                  return (
                    <div key={tid} className="flex flex-col gap-6">

                      {/* ── Treatment heading: name + divider + Remove ── */}
                      <div className="flex items-center gap-4">
                        <div className="flex flex-1 items-center gap-3 min-w-0">
                          <div className="shrink-0 bg-brand-navy rounded-[20px] px-3 py-1.5">
                            <span className="text-[20px] font-semibold leading-7 tracking-[-0.5px] text-white">
                              {name}
                            </span>
                          </div>
                          <div className="flex-1 h-px bg-[#e4e4e7]" aria-hidden="true" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTreatment(tid)}
                          className="shrink-0 border border-[#e4e4e7] rounded-md px-2 py-1 text-xs font-medium text-[#09090b] bg-white shadow-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
                        >
                          Remove
                        </button>
                      </div>

                      {/* ── Which type? (GLP-1 only) ── */}
                      {tid === 'glp-1' && (
                        <div
                          ref={el => { if (el) sectionRefs.current.set(`${tid}-type`, el); else sectionRefs.current.delete(`${tid}-type`) }}
                          className="flex flex-col gap-2"
                        >
                          <SectionLabel id={`${tid}-type-label`}>Which type?</SectionLabel>
                          <div
                            role="group"
                            aria-labelledby={`${tid}-type-label`}
                            aria-describedby={fieldErrors[tid]?.type ? `${tid}-type-error` : undefined}
                            // 2-column grid wraps to 2-2-1 with five options, matching Figma 600:6769.
                            className="grid grid-cols-2 gap-2"
                          >
                            {GLP1_TYPES.map(opt => (
                              <MedOptionCard
                                key={opt.id}
                                isSelected={choice.type === opt.id}
                                onClick={() => setChoice(tid, 'type', opt.id as Glp1Type)}
                                label={opt.label}
                                sub={opt.sub}
                              />
                            ))}
                          </div>
                          {fieldErrors[tid]?.type && (
                            <p id={`${tid}-type-error`} role="alert" className="text-xs text-red-600 leading-4">Please select a type.</p>
                          )}
                        </div>
                      )}

                      {/* For GLP-1, the "How would you like to take it?"
                          picker stays hidden until the user selects a
                          type (Semaglutide / Tirzepatide / Foundayo® /
                          Wegovy® / Zepbound®) — each type carries its
                          own list of form factors. The "Prescription
                          plan" picker only appears for compounded types
                          (Semaglutide, Tirzepatide); branded options
                          are fulfilled through the manufacturer's
                          pharmacy partner so the plan UI doesn't apply.
                          Non-GLP-1 treatments always render the form
                          picker (auto-selected if there's only one
                          option) and the plan picker below. */}
                      {tid === 'glp-1' && !choice.type ? null : (
                      <>
                      {/* ── How would you like to take it? ── */}
                      {(() => {
                        const formOpts = getFormOptions(tid, choice.type)
                        return (
                      <div
                        ref={el => { if (el) sectionRefs.current.set(`${tid}-form`, el); else sectionRefs.current.delete(`${tid}-form`) }}
                        className="flex flex-col gap-2"
                      >
                        <SectionLabel id={`${tid}-form-label`}>How would you like to take it?</SectionLabel>
                        <div
                          role="group"
                          aria-labelledby={`${tid}-form-label`}
                          aria-describedby={fieldErrors[tid]?.form ? `${tid}-form-error` : undefined}
                          // 2-column grid keeps each card at ~50% of the
                          // container width regardless of how many
                          // options exist — single-option treatments
                          // (GHK-Cu / Sermorelin / etc.) get a 50%-wide
                          // card with the right slot empty, instead of a
                          // single 100%-wide card that looks oversized.
                          className="grid grid-cols-2 gap-2"
                        >
                          {formOpts.map(opt => (
                            <MedOptionCard
                              key={opt.id}
                              isSelected={choice.form === opt.id}
                              onClick={() => setChoice(tid, 'form', opt.id as MedForm)}
                              label={opt.label}
                              sub={opt.sub}
                            />
                          ))}
                        </div>
                        {fieldErrors[tid]?.form && (
                          <p id={`${tid}-form-error`} role="alert" className="text-xs text-red-600 leading-4">Please select a form</p>
                        )}
                      </div>
                        )
                      })()}

                      {/* ── Prescription plan ──
                          Always present once the patient has progressed
                          enough to know which prices to show:
                          • Non-GLP-1: render with the four PLAN_DEFS as
                            soon as treatment is added.
                          • Compounded GLP-1: same set, after type pick.
                          • Branded GLP-1: a single read-only 1-month
                            card showing "Starting at $X†" — surfaced
                            after a form factor is chosen so the
                            $-amount is unambiguous. */}
                      {(() => {
                        const isBranded = tid === 'glp-1' && !!choice.type && !isCompoundedGlp1(choice.type)
                        // Branded plans need form first (price comes from form factor).
                        if (isBranded && !choice.form) return null
                        // Compounded GLP-1 needs at least a type.
                        if (tid === 'glp-1' && !choice.type) return null
                        return (
                      <div
                        ref={el => { if (el) sectionRefs.current.set(`${tid}-plan`, el); else sectionRefs.current.delete(`${tid}-plan`) }}
                        className="flex flex-col gap-2"
                      >
                        <SectionLabel id={`${tid}-plan-label`}>Medication plan</SectionLabel>
                        {!isBranded && (
                          <p className="text-sm leading-5 text-[#09090b]">
                            No surprise price changes as your dose increases.
                          </p>
                        )}
                        <div
                          role="group"
                          aria-labelledby={`${tid}-plan-label`}
                          aria-describedby={fieldErrors[tid]?.plan ? `${tid}-plan-error` : undefined}
                          className="flex flex-col gap-3"
                        >
                          {isBranded ? (
                            // Branded: single 1-month card, pre-selected,
                            // showing the manufacturer's starting price.
                            // The dagger here ties to the same branded
                            // pricing footnote rendered above the picker.
                            (() => {
                              const startingPrice = getBrandedStartingPrice(choice.type, choice.form)
                              return (
                                <div
                                  className="border-2 border-brand-blue rounded-lg p-4 flex items-center"
                                  aria-label="1-month supply selected"
                                >
                                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                                    <p className="text-base font-normal leading-6 text-brand-blue">
                                      1-month supply
                                    </p>
                                    <p className="text-2xl font-normal leading-8 text-[rgba(0,0,0,0.87)] tracking-[-0.6px]">
                                      $15 + medication cost starting at ${startingPrice ?? '—'}<sup>†</sup>
                                    </p>
                                  </div>
                                </div>
                              )
                            })()
                          ) : (
                            // Compounded GLP-1 / non-GLP-1: existing
                            // four-plan picker fed by the catalog.
                            (() => {
                              const slug = resolveCatalogSlug(tid, choice.type)
                              const formForLookup = (choice.form ?? 'injection')
                              const oneMonthCents = lookupPriceCents(pricingCatalog, slug, formForLookup, '1mo')
                              return PLAN_DEFS.map(def => {
                                const priceCents = lookupPriceCents(pricingCatalog, slug, formForLookup, def.id)
                                return (
                                  <PlanRow
                                    key={def.id}
                                    def={def}
                                    isSelected={choice.plan === def.id}
                                    onClick={() => setChoice(tid, 'plan', def.id as MedPlan)}
                                    priceCents={priceCents}
                                    oneMonthCents={oneMonthCents}
                                  />
                                )
                              })
                            })()
                          )}
                        </div>
                        {fieldErrors[tid]?.plan && (
                          <p id={`${tid}-plan-error`} role="alert" className="text-xs text-red-600 leading-4">Please select a plan.</p>
                        )}
                        {/* The 6/12-month-shipment footnote only applies
                            when those plans are visible — i.e., not on
                            branded GLP-1 (single 1-month card). */}
                        {!isBranded && (
                          <p className="text-sm leading-5 text-[#09090b]">
                            <sup>†</sup>For 6- and 12-month plans, medication will be shipped 3 months at a time.
                          </p>
                        )}
                        {/* Branded GLP-1 manufacturer-pricing footnote.
                            Two short paragraphs:
                            (1) charge-separately note tied to the † on
                                the 1-month card,
                            (2) dose-pricing disclaimer + link to the
                                partner's official site.
                            Pharmacy partner is dynamic per brand:
                            NovoCare® for Wegovy, LillyDirect® for
                            Zepbound and Foundayo. */}
                        {isBranded && (() => {
                          const partner = BRANDED_GLP1_PARTNERS[choice.type!] ?? ''
                          const url = BRANDED_GLP1_OFFICIAL_URLS[choice.type!] ?? '#'
                          return (
                            <div className="flex flex-col gap-6 text-base leading-6 text-[#09090b]">
                              <p>
                                <sup>†</sup>Medication cost will be charged separately by {partner} after your prescription is sent to them.
                              </p>
                              <p>
                                Pricing may vary based on the dose prescribed by your provider. Please refer to the{' '}
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-blue underline underline-offset-2"
                                >
                                  {partner} website
                                </a>
                                {' '}for full pricing details.
                              </p>
                            </div>
                          )
                        })()}
                      </div>
                        )
                      })()}
                      </>
                      )}

                    </div>
                  )
                })}
            </div>
          )}

        </div>
      </main>

      {/* ── Sticky CTA ── */}
      <div
        ref={stickyCtaRef}
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-12 pt-4"
        style={{
          background: 'linear-gradient(to top, white 70%, rgba(255,255,255,0))',
          opacity: done ? 1 : 0,
          pointerEvents: done ? 'auto' : 'none',
          transition: 'opacity 0.5s',
        }}
      >
        <div className="w-full md:w-[560px] flex flex-col">

          {/* Save and continue button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={isNavigating}
            className="
              relative w-full h-[42px] flex items-center justify-center gap-3 px-4
              rounded-tl-[36px] cursor-pointer
              text-white text-base font-medium leading-6 whitespace-nowrap
              transition-opacity hover:opacity-90 disabled:opacity-60
              shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
            "
            style={{ background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-blue) 64.61%, var(--brand-mint) 100%)' }}
          >
            Save and continue
            <ChevronRightIcon />
          </button>

          {/* Inclusions bar — image left, list right */}
          <div
            className="w-full flex items-center justify-center gap-6 p-4 rounded-br-[36px] backdrop-blur-sm"
            style={{ background: 'rgba(29,45,68,0.95)' }}
          >
            {/* Product image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/cta-medications.png"
              alt=""
              className="shrink-0 size-[84px] object-contain"
              aria-hidden="true"
            />

            {/* Text */}
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal leading-4 tracking-[1.5px] uppercase text-white">
                Included with your plan
              </p>
              <div className="flex flex-col gap-1">
                {['Licensed provider review', 'Delivery to your doorstep', 'Ongoing support'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckFilledIcon />
                    <span className="text-[12px] font-normal leading-4 text-white whitespace-nowrap">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
