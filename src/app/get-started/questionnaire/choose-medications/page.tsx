'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import { getStepValues, saveStep } from '@/lib/intake-session-store'

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

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
      className="size-3.5 shrink-0 text-[#00b4c8]" aria-hidden="true">
      <path fillRule="evenodd"
        d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm3.844 4.574a.75.75 0 0 0-1.188-.918L7.172 8.35 5.28 6.483a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.12-.08l4.004-5.39Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Treatment names ──────────────────────────────────────────────────────────

const TREATMENT_NAMES: Record<string, string> = {
  'ghk-cu': 'GHK-Cu',
  'glp-1': 'GLP-1',
  'glutathione': 'Glutathione',
  'nad-plus': 'NAD+',
  'sermorelin': 'Sermorelin',
}

// ─── Option sets ──────────────────────────────────────────────────────────────

const GLP1_TYPES = [
  { id: 'semaglutide', label: 'Semaglutide', sub: 'As low as $99/mo' },
  { id: 'tirzepatide', label: 'Tirzepatide', sub: 'As low as $149/mo' },
] as const

const FORM_OPTIONS = [
  { id: 'injection', label: 'Injection', sub: 'Once-weekly' },
  { id: 'oral', label: 'Oral tablets', sub: 'Once-daily' },
] as const

const PLAN_OPTIONS = [
  { id: '1mo', label: '1-month supply', price: 149, perMonth: null, tag: null, badge: null },
  { id: '3mo', label: '3-month supply', price: 417, perMonth: '$139/mo', tag: 'MOST POPULAR', badge: 'SAVE $30' },
  { id: '6mo', label: '6-month supply*', price: 774, perMonth: '$129/mo', tag: null, badge: 'SAVE $60' },
  { id: '12mo', label: '12-month supply*', price: 1188, perMonth: '$99/mo', tag: 'BEST VALUE', badge: 'SAVE $600' },
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

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 80

// ─── Routes ──────────────────────────────────────────────────────────────────

const NEXT_STEP = '/get-started/questionnaire/checkout'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RadioCard({
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
      style={isSelected ? {
        padding: '2px',
        background: 'linear-gradient(90deg, #0778ba 0%, #00b4c8 100%)',
        borderRadius: 10,
      } : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex flex-col items-center justify-center gap-0.5 py-3 px-2 transition-colors ${
          isSelected
            ? 'rounded-[8px] bg-white text-[#0778ba]'
            : 'rounded-lg border border-[#e4e4e7] bg-white text-[rgba(0,0,0,0.87)] hover:border-[#0778ba]/40'
        }`}
      >
        <span className="text-sm font-semibold">{label}</span>
        <span className={`text-xs ${isSelected ? 'text-[#0778ba]/70' : 'text-[rgba(0,0,0,0.5)]'}`}>{sub}</span>
      </button>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ChooseMedicationsPage() {
  const router = useRouter()
  const [treatments, setTreatments] = useState<string[]>([])
  const [choices, setChoices] = useState<Record<string, MedChoice>>({})
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    const step12 = getStepValues(12)
    let ids: string[] = []
    if (typeof step12.treatments === 'string') {
      try { ids = JSON.parse(step12.treatments) } catch { /* ignore */ }
    }
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
  }, [])

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

  const cartItems = treatments.map(id => {
    const c = choices[id]
    let name: string
    if (id === 'glp-1' && c?.type) {
      name = c.type === 'semaglutide' ? 'Semaglutide' : 'Tirzepatide'
    } else {
      name = TREATMENT_NAMES[id] ?? id
    }
    const form = c?.form === 'injection' ? 'Injections' : c?.form === 'oral' ? 'Oral Tablets' : null
    const plan = c?.plan ? c.plan.replace('mo', ' mo') : null
    return [name, form, plan].filter(Boolean).join(' ') + (plan ? ` (${plan})` : '')
  }).filter(item => !!choices[item.split(' ')[0]?.toLowerCase()] || true)

  function handleContinue() {
    if (isNavigating || !isComplete) return
    setIsNavigating(true)
    const bubbles = treatments.map(id => {
      const c = choices[id]
      let name: string
      if (id === 'glp-1' && c?.type) {
        name = c.type === 'semaglutide' ? 'Semaglutide' : 'Tirzepatide'
      } else {
        name = TREATMENT_NAMES[id] ?? id
      }
      const form = c?.form === 'injection' ? 'Injections' : 'Oral Tablets'
      const plan = c?.plan ? c.plan.replace('mo', ' mo') : ''
      return `${name} ${form} (${plan})`
    })
    saveStep(
      13,
      { question: 'Choose your medications', bubbles },
      { choices: JSON.stringify(choices) }
    )
    router.push(NEXT_STEP)
  }

  return (
    <>
      <IntakeHeader backHref="/get-started/questionnaire/review" progress={PROGRESS} />

      <main
        className="overflow-y-auto bg-white"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: '10rem',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-9 py-6 md:py-9">

          {/* ── Eve's message ── */}
          <div className="flex items-start gap-3 w-full">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)]">
                Now, choose your medication details.
              </p>
            </div>
          </div>

          {/* ── Treatment sections ── */}
          {treatments.length === 0 ? (
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
            <div className="flex flex-col gap-9">
              {treatments.map((tid) => {
                const choice = choices[tid] ?? { type: null, form: null, plan: null }
                return (
                  <div key={tid} className="flex flex-col gap-5">

                    {/* Header chip */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-[#f4f4f5] rounded-full px-3 py-1.5">
                        <span className="text-sm font-semibold text-[rgba(0,0,0,0.87)]">
                          {TREATMENT_NAMES[tid] ?? tid}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTreatment(tid)}
                        className="text-xs font-medium text-[#0778ba] underline hover:opacity-70 transition-opacity shrink-0"
                      >
                        Remove
                      </button>
                    </div>

                    {/* TYPE — GLP-1 only */}
                    {tid === 'glp-1' && (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs font-semibold tracking-widest uppercase text-[rgba(0,0,0,0.5)]">
                          Type
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {GLP1_TYPES.map(opt => (
                            <RadioCard
                              key={opt.id}
                              isSelected={choice.type === opt.id}
                              onClick={() => setChoice(tid, 'type', opt.id as Glp1Type)}
                              label={opt.label}
                              sub={opt.sub}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* HOW YOU'LL TAKE IT */}
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold tracking-widest uppercase text-[rgba(0,0,0,0.5)]">
                        How you&rsquo;ll take it
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {FORM_OPTIONS.map(opt => (
                          <RadioCard
                            key={opt.id}
                            isSelected={choice.form === opt.id}
                            onClick={() => setChoice(tid, 'form', opt.id as MedForm)}
                            label={opt.label}
                            sub={opt.sub}
                          />
                        ))}
                      </div>
                    </div>

                    {/* SUBSCRIPTION PLAN */}
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold tracking-widest uppercase text-[rgba(0,0,0,0.5)]">
                        Subscription plan
                      </p>
                      <div className="flex flex-col gap-2">
                        {PLAN_OPTIONS.map(opt => {
                          const isSelected = choice.plan === opt.id
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setChoice(tid, 'plan', opt.id as MedPlan)}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                                isSelected
                                  ? 'border-2 border-[#0778ba]'
                                  : 'border border-[#e4e4e7] hover:border-[#0778ba]/40'
                              }`}
                            >
                              <div className="flex flex-col items-start gap-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-sm font-semibold ${isSelected ? 'text-[#0778ba]' : 'text-[rgba(0,0,0,0.87)]'}`}>
                                    {opt.label}
                                  </span>
                                  {opt.tag && (
                                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#0778ba] bg-blue-50 px-1.5 py-0.5 rounded-full leading-none">
                                      {opt.tag}
                                    </span>
                                  )}
                                </div>
                                {opt.perMonth && (
                                  <span className="text-xs text-[rgba(0,0,0,0.5)]">{opt.perMonth}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {opt.badge && (
                                  <span className="text-[10px] font-semibold tracking-widest uppercase text-[#047857] bg-[#d1fae5] px-1.5 py-0.5 rounded-full leading-none">
                                    {opt.badge}
                                  </span>
                                )}
                                <span className={`text-base font-bold ${isSelected ? 'text-[#0778ba]' : 'text-[rgba(0,0,0,0.87)]'}`}>
                                  ${opt.price}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-xs text-[rgba(0,0,0,0.45)] leading-4">
                        *For 6- and 12-month plans, medication will be shipped 3 months at a time.
                      </p>
                    </div>

                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>

      {/* ── Sticky compound CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-6 md:pb-8">
        <div className="w-full md:w-[480px] flex flex-col">

          {/* Cart pills */}
          {cartItems.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 px-1">
              {cartItems.map((item, i) => (
                <span
                  key={i}
                  className="text-xs bg-white border border-[#e4e4e7] rounded-full px-2.5 py-1 text-[rgba(0,0,0,0.6)] shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          {/* Button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={isNavigating || !isComplete}
            className="
              w-full h-[42px] flex items-center justify-center gap-3 px-4
              rounded-tl-[36px]
              text-white text-base font-medium leading-6 whitespace-nowrap
              transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
              shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white
            "
            style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
          >
            Save and continue
            <ChevronRightIcon />
          </button>

          {/* Inclusions bar */}
          <div
            className="w-full px-4 py-3 rounded-br-[36px]"
            style={{ background: 'rgba(29,45,68,0.95)', backdropFilter: 'blur(8px)' }}
          >
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/50 mb-2">
              Included with your meds
            </p>
            <div className="flex flex-col gap-1.5">
              {['Licensed provider review', 'Delivery to your doorstep', 'Ongoing 24/7 support'].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircleIcon />
                  <span className="text-xs text-white/80">{item}</span>
                </div>
              ))}
            </div>
            {dueToday > 0 && (
              <p className="text-xs text-white/60 mt-2.5">
                DUE TODAY{' '}
                <span className="text-sm font-bold text-white">${dueToday.toLocaleString()}</span>
              </p>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
