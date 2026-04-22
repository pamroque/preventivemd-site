'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'

const QUESTION_TEXT = 'Choose your desired medication and subscription.'

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
      className="size-5 shrink-0 text-[#00b4c8]" aria-hidden="true">
      <path fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Data ────────────────────────────────────────────────────────────────────

// Mirrors the display order on the choose-treatments page (alphabetical by name)
const TREATMENT_ORDER = ['ghk-cu', 'glp-1', 'glutathione', 'nad-plus', 'sermorelin']

const TREATMENT_NAMES: Record<string, string> = {
  'ghk-cu': 'GHK-Copper',
  'glp-1': 'GLP-1',
  'glutathione': 'Glutathione',
  'nad-plus': 'NAD+',
  'sermorelin': 'Sermorelin',
}

const GLP1_TYPES = [
  { id: 'semaglutide', label: 'Semaglutide', sub: 'As low as $99/mo' },
  { id: 'tirzepatide', label: 'Tirzepatide', sub: 'As low as $149/mo' },
] as const

const FORM_OPTIONS = [
  { id: 'injection', label: 'Injection vials', sub: 'Once-weekly' },
  { id: 'oral', label: 'Pills', sub: 'Once-daily' },
] as const

const PLAN_OPTIONS = [
  { id: '1mo',  label: '1-month supply',   price: 149,  perMonth: null,       tag: null,           badge: null },
  { id: '3mo',  label: '3-month supply',   price: 417,  perMonth: '$139/mo',  tag: 'Most Popular', badge: 'SAVE $30' },
  { id: '6mo',  label: '6-month supply*',  price: 774,  perMonth: '$129/mo',  tag: null,           badge: 'SAVE $60' },
  { id: '12mo', label: '12-month supply*', price: 1188, perMonth: '$99/mo',   tag: 'Best Value',   badge: 'SAVE $600' },
] as const

const PLAN_PRICES: Record<string, number> = { '1mo': 149, '3mo': 417, '6mo': 774, '12mo': 1188 }

// ─── Types ────────────────────────────────────────────────────────────────────

type Glp1Type = 'semaglutide' | 'tirzepatide'
type MedForm = 'injection' | 'oral'
type MedPlan = '1mo' | '3mo' | '6mo' | '12mo'

interface MedChoice {
  type: Glp1Type | null
  form: MedForm | null
  plan: MedPlan | null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium text-[rgba(0,0,0,0.87)]">
      {children} <span className="text-[#b91c1c]">*</span>
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
  sub: string
}) {
  return (
    <div
      className="flex-1"
      style={isSelected ? {
        padding: 2,
        background: 'linear-gradient(90deg, #0778ba 0%, #00b4c8 100%)',
        borderRadius: 10,
      } : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex flex-col items-start gap-1 px-4 py-3 transition-colors ${
          isSelected
            ? 'rounded-[8px] bg-white'
            : 'rounded-lg border border-[#e3e3e3] bg-white hover:border-[#0778ba]/40'
        }`}
      >
        <span className={`text-[18px] font-medium leading-7 ${isSelected ? 'text-[#0778ba]' : 'text-[rgba(0,0,0,0.87)]'}`}>
          {label}
        </span>
        <span className={`text-sm leading-5 ${isSelected ? 'text-[#0778ba]/70' : 'text-[rgba(0,0,0,0.6)]'}`}>
          {sub}
        </span>
      </button>
    </div>
  )
}

function PlanRow({
  opt,
  isSelected,
  onClick,
}: {
  opt: typeof PLAN_OPTIONS[number]
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      style={isSelected ? {
        padding: 2,
        background: 'linear-gradient(90deg, #0778ba 0%, #00b4c8 100%)',
        borderRadius: 10,
      } : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex flex-col gap-1 p-4 text-left transition-colors ${
          isSelected
            ? 'rounded-[8px] bg-white'
            : 'rounded-lg border border-[#e3e3e3] bg-white hover:border-[#0778ba]/40'
        }`}
      >
        {/* Supply label + optional inline tag */}
        <div className="flex items-center gap-2">
          <span className={`text-base font-normal leading-6 ${isSelected ? 'text-[#0778ba]' : 'text-[rgba(0,0,0,0.87)]'}`}>
            {opt.label}
          </span>
          {opt.tag && (
            <span className="text-[12px] font-semibold tracking-[1.5px] uppercase text-[#07808d]">
              {opt.tag}
            </span>
          )}
        </div>

        {/* Price row */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[24px] font-normal leading-8 ${isSelected ? 'text-[#0778ba]' : 'text-[rgba(0,0,0,0.87)]'}`}>
              ${opt.price.toLocaleString()}
            </span>
            {opt.perMonth && (
              <span className="text-sm text-[rgba(0,0,0,0.6)]">
                ({opt.perMonth})
              </span>
            )}
          </div>
          {opt.badge && (
            <span className="text-xs font-normal text-[#047857] bg-[#d1fae5] px-1.5 py-1 rounded-xl">
              {opt.badge}
            </span>
          )}
        </div>
      </button>
    </div>
  )
}

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 80

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


  useEffect(() => {
    const step12 = getStepValues(12)
    let ids: string[] = []
    if (typeof step12.treatments === 'string') {
      try { ids = JSON.parse(step12.treatments) } catch { /* ignore */ }
    }
    // Sort to match choose-treatments page display order
    ids.sort((a, b) => TREATMENT_ORDER.indexOf(a) - TREATMENT_ORDER.indexOf(b))
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
    setChoices(initial)

    const prior = getPriorSteps(13)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({
        ...last,
        editHref: '/get-started/questionnaire/choose-treatments',
      })
    }
  }, [])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  function removeTreatment(id: string) {
    setTreatments(prev => prev.filter(t => t !== id))
    setChoices(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function setChoice<K extends keyof MedChoice>(treatmentId: string, field: K, value: MedChoice[K]) {
    setChoices(prev => ({
      ...prev,
      [treatmentId]: { ...prev[treatmentId], [field]: value },
    }))
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
      return !!c.form && !!c.plan
    })

  const dueToday = treatments.reduce((sum, id) => {
    const plan = choices[id]?.plan
    return sum + (plan ? (PLAN_PRICES[plan] ?? 0) : 0)
  }, 0)

  function handleContinue() {
    if (isNavigating) return
    const errors: Record<string, { type?: boolean; form?: boolean; plan?: boolean }> = {}
    treatments.forEach(id => {
      const c = choices[id]
      const err: { type?: boolean; form?: boolean; plan?: boolean } = {}
      if (id === 'glp-1' && !c?.type) err.type = true
      if (!c?.form) err.form = true
      if (!c?.plan) err.plan = true
      if (Object.keys(err).length > 0) errors[id] = err
    })
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setIsNavigating(true)
    const bubbles = treatments.map(id => {
      const c = choices[id]
      let name: string
      if (id === 'glp-1' && c?.type) {
        name = c.type === 'semaglutide' ? 'Semaglutide' : 'Tirzepatide'
      } else {
        name = TREATMENT_NAMES[id] ?? id
      }
      const form = c?.form === 'injection' ? 'Injection vials' : 'Pills'
      const plan = c?.plan ?? ''
      return `${name} · ${form} · ${plan}`
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
      <IntakeHeader backHref="/get-started/questionnaire/choose-treatments" progress={PROGRESS} />

      <main
        className="overflow-y-auto bg-white"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: '12rem',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

          <ChatHistory
            historicSteps={[]}
            currentStep={currentStep}
            animateCurrentStep={animateBubbles}
          />

          {/* ── Eve's message ── */}
          <div id="main-content" tabIndex={-1} className="flex items-start gap-3 w-full focus:outline-none">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <p
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
              </p>
            </div>
          </div>

          {/* ── Medication sections ── */}
          {done && (
            treatments.length === 0 ? (
              <p className="text-sm text-[rgba(0,0,0,0.6)]">
                No treatments selected.{' '}
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="text-[#0778ba] underline"
                >
                  Go back to add some.
                </button>
              </p>
            ) : (
              <div className="flex flex-col gap-12 animate-[fadeIn_0.4s_ease_forwards]">
                {treatments.map((tid) => {
                  const choice = choices[tid] ?? { type: null, form: null, plan: null }
                  const name = TREATMENT_NAMES[tid] ?? tid

                  return (
                    <div key={tid} className="flex flex-col gap-6">

                      {/* ── Treatment heading: name + divider + Remove ── */}
                      <div className="flex items-center gap-4">
                        <div className="flex flex-1 items-center gap-3 min-w-0">
                          <span className="text-[20px] font-semibold leading-7 tracking-[-0.5px] text-[#09090b] shrink-0">
                            {name}
                          </span>
                          <div className="flex-1 h-px bg-[#e4e4e7]" aria-hidden="true" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTreatment(tid)}
                          className="shrink-0 border border-[#e4e4e7] rounded-md px-2 py-1 text-xs font-medium text-[#09090b] bg-white shadow-sm hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
                        >
                          Remove
                        </button>
                      </div>

                      {/* ── Which type? (GLP-1 only) ── */}
                      {tid === 'glp-1' && (
                        <div className="flex flex-col gap-2">
                          <SectionLabel>Which type?</SectionLabel>
                          <div className="flex gap-2">
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
                            <p role="alert" className="text-xs text-red-500 leading-4">Please select a type.</p>
                          )}
                        </div>
                      )}

                      {/* ── How would you like to take it? ── */}
                      <div className="flex flex-col gap-2">
                        <SectionLabel>How would you like to take it?</SectionLabel>
                        <div className="flex gap-2">
                          {FORM_OPTIONS.map(opt => (
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
                          <p role="alert" className="text-xs text-red-500 leading-4">Please select a form.</p>
                        )}
                      </div>

                      {/* ── Prescription plan ── */}
                      <div className="flex flex-col gap-2">
                        <SectionLabel>Prescription plan</SectionLabel>
                        <div className="flex flex-col gap-3">
                          {PLAN_OPTIONS.map(opt => (
                            <PlanRow
                              key={opt.id}
                              opt={opt}
                              isSelected={choice.plan === opt.id}
                              onClick={() => setChoice(tid, 'plan', opt.id as MedPlan)}
                            />
                          ))}
                        </div>
                        {fieldErrors[tid]?.plan && (
                          <p role="alert" className="text-xs text-red-500 leading-4">Please select a plan.</p>
                        )}
                        <p className="text-xs text-[#71717a] leading-4">
                          *For 6- and 12-month plans, medication will be shipped 3 months at a time.
                        </p>
                      </div>

                    </div>
                  )
                })}
              </div>
            )
          )}

        </div>
      </main>

      {/* ── Sticky CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-8 pt-4"
        style={{
          background: 'linear-gradient(to top, white 70%, rgba(255,255,255,0))',
          opacity: done ? 1 : 0,
          pointerEvents: done ? 'auto' : 'none',
          transition: 'opacity 0.5s',
        }}
      >
        <div className="w-full md:w-[480px] flex flex-col">

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
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white
            "
            style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
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
                Included with your meds
              </p>
              <div className="flex flex-col gap-1">
                {['Licensed provider review', 'Delivery to your doorstep', 'Ongoing 24/7 support'].map(item => (
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
