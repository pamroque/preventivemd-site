'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'

const QUESTION_TEXT = 'Which treatments would you like to request? *'

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

// ─── Treatments ───────────────────────────────────────────────────────────────
// Kept alphabetical by name. The selected/pre-selected item is moved to the top
// at render time.

interface Treatment {
  id: string
  name: string
  description: string
}

const TREATMENTS: readonly Treatment[] = [
  {
    id: 'ghk-cu',
    name: 'GHK-Copper',
    description: 'May support collagen and elastin production, skin repair, and healthier hair',
  },
  {
    id: 'glp-1',
    name: 'GLP-1',
    description: 'Examples include Semaglutide and Tirzepatide. May help support weight management by helping you feel fuller.',
  },
  {
    id: 'glutathione',
    name: 'Glutathione',
    description: 'May help support antioxidant defense, liver function, skin appearance, and immunity',
  },
  {
    id: 'nad-plus',
    name: 'NAD+',
    description: 'May help support cellular energy production, healthy aging, and metabolic function',
  },
  {
    id: 'sermorelin',
    name: 'Sermorelin',
    description: 'May help support your body’s natural growth hormone production to promote healthy metabolism and body composition',
  },
] as const

// Treatment highlight from a /treatments/[slug] page → treatment id on this page.
// Add new entries as treatments are onboarded to the questionnaire.
const PEPTIDE_TO_TREATMENT_ID: Record<string, string> = {
  'Semaglutide': 'glp-1',
  'Tirzepatide': 'glp-1',
  'NAD+': 'nad-plus',
  'Sermorelin': 'sermorelin',
  'Glutathione': 'glutathione',
}

// Step-3 health goal id → treatment ids that earn the GOAL MATCH badge.
// Includes future treatments so the mapping is ready when they land on the page.
const GOAL_TO_TREATMENTS: Record<string, readonly string[]> = {
  weight: ['glp-1', 'aod-9604'],
  sleep: ['epitalon', 'pinealon', 'dsip'],
  stress: ['selank'],
  energy: ['nad-plus', 'glutathione', 'ss-31', 'mots-c'],
  focus: ['semax', 'dihexa'],
  inflammation: ['ghk-cu', 'thymosin-alpha-1', 'bpc-157', 'tb-500', 'kpv'],
  recovery: ['sermorelin', 'tesamorelin', 'cjc-1295', 'ipamorelin', 'igf-1-lr3'],
  sexual: ['pt-141'],
}

// Treatment id → step-5 condition ids that make it ineligible. If ALL treatments
// end up ineligible the page redirects to the shared disqualification state.
const TREATMENT_INELIGIBILITY: Record<string, readonly string[]> = {
  'glp-1': ['mtc', 'men2'],
}

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 65

// ─── Routes ──────────────────────────────────────────────────────────────────

const NEXT_STEP = '/get-started/questionnaire/choose-medications'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ChooseTreatmentsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [preCheckedId, setPreCheckedId] = useState<string | null>(null)
  const [goalMatchedIds, setGoalMatchedIds] = useState<Set<string>>(new Set())
  const [ineligibleIds, setIneligibleIds] = useState<Set<string>>(new Set())
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [showEmptyError, setShowEmptyError] = useState(false)
  const [showPreCheckedNote, setShowPreCheckedNote] = useState(true)

  useEffect(() => {
    // Step-5 conditions determine per-treatment ineligibility.
    const conditionsVal = getStepValues(4).conditions
    const conditions = typeof conditionsVal === 'string' && conditionsVal
      ? new Set(conditionsVal.split(','))
      : new Set<string>()
    const ineligible = new Set<string>()
    TREATMENTS.forEach(t => {
      const blockers = TREATMENT_INELIGIBILITY[t.id]
      if (blockers && blockers.some(c => conditions.has(c))) ineligible.add(t.id)
    })
    setIneligibleIds(ineligible)

    // If every available treatment is ineligible, end the intake here.
    if (TREATMENTS.every(t => ineligible.has(t.id))) {
      router.replace('/get-started/questionnaire/disqualification')
      return
    }

    // Peptide carried over from a /treatments/[slug] entry → pre-check target,
    // but only if that treatment is still eligible.
    const intro = getStepValues(99)
    const peptide = typeof intro.peptide === 'string' ? intro.peptide : ''
    const mapped = peptide ? PEPTIDE_TO_TREATMENT_ID[peptide] ?? null : null
    const preId = mapped && !ineligible.has(mapped) ? mapped : null
    setPreCheckedId(preId)

    // Restore prior selection if returning to the page (minus anything newly
    // ineligible); otherwise apply the pre-check.
    const saved = getStepValues(12)
    let restored: string[] | null = null
    if (typeof saved.treatments === 'string' && saved.treatments) {
      try {
        const parsed = JSON.parse(saved.treatments) as string[]
        const eligibleOnly = Array.isArray(parsed)
          ? parsed.filter(id => !ineligible.has(id))
          : []
        if (eligibleOnly.length > 0) restored = eligibleOnly
      } catch { /* ignore */ }
    }
    if (restored) {
      setSelected(new Set(restored))
      setShowPreCheckedNote(false)
    } else if (preId) {
      setSelected(new Set([preId]))
    }

    // GOAL MATCH badge is driven by step-3 (health goals) selections.
    const goalsVals = getStepValues(2)
    const goals = typeof goalsVals.goals === 'string'
      ? goalsVals.goals.split(',').filter(Boolean)
      : []
    const matched = new Set<string>()
    goals.forEach(g => {
      const ts = GOAL_TO_TREATMENTS[g]
      if (ts) ts.forEach(t => matched.add(t))
    })
    setGoalMatchedIds(matched)

    const prior = getPriorSteps(12)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({
        ...last,
        editHref: '/get-started/questionnaire/visit-type',
      })
    }
  }, [router])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  // Eligible first (pre-checked at the top, rest alphabetical), ineligible last.
  const sortedTreatments = useMemo(() => {
    const alpha = [...TREATMENTS].sort((a, b) => a.name.localeCompare(b.name))
    const eligible = alpha.filter(t => !ineligibleIds.has(t.id))
    const ineligible = alpha.filter(t => ineligibleIds.has(t.id))
    if (preCheckedId) {
      const idx = eligible.findIndex(t => t.id === preCheckedId)
      if (idx > 0) {
        const [pre] = eligible.splice(idx, 1)
        eligible.unshift(pre)
      }
    }
    return [...eligible, ...ineligible]
  }, [preCheckedId, ineligibleIds])

  function toggle(id: string) {
    setShowEmptyError(false)
    setShowPreCheckedNote(false)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleContinue() {
    if (isNavigating) return
    if (selected.size === 0) {
      setShowEmptyError(true)
      return
    }
    setIsNavigating(true)
    const selectedTreatments = TREATMENTS.filter(t => selected.has(t.id))
    saveStep(
      12,
      {
        question: 'Which treatments would you like to request?',
        bubbles: selectedTreatments.map(t => t.name),
      },
      { treatments: JSON.stringify([...selected]) }
    )
    router.push(NEXT_STEP)
  }

  return (
    <>
      <IntakeHeader backHref="/get-started/questionnaire/visit-type" progress={PROGRESS} />

      <main
        className="overflow-y-auto bg-white"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: '5rem',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

          <ChatHistory
            historicSteps={[]}
            currentStep={currentStep}
            animateCurrentStep={animateBubbles}
          />

          {/* ── Eve's question ── */}
          <div id="main-content" tabIndex={-1} className="flex items-start gap-3 w-full focus:outline-none">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <p
                className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
                aria-live="polite"
                aria-label={QUESTION_TEXT}
              >
                {typingStarted && (
                  <>
                    {words.slice(0, visibleWords).map((word, i) => (
                      <span key={i} className={word === '*' ? 'text-red-500' : undefined}>
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
              {done && preCheckedId && showPreCheckedNote && (
                <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                  {TREATMENTS.find(t => t.id === preCheckedId)?.name ?? preCheckedId} has been pre-checked based on your initial interest.
                </p>
              )}
              {done && showEmptyError && (
                <p
                  id="treatments-error"
                  role="alert"
                  className="text-sm leading-5 text-red-500"
                >
                  Please check at least one treatment.
                </p>
              )}
            </div>
          </div>

          {/* ── Treatment cards ── */}
          {done && (
          <div
            className="flex flex-col gap-3 animate-[fadeIn_0.4s_ease_forwards]"
            aria-describedby={showEmptyError ? 'treatments-error' : undefined}
          >
            {sortedTreatments.filter(t => !ineligibleIds.has(t.id)).map((t) => {
              const isSelected = selected.has(t.id)
              const isGoalMatch = goalMatchedIds.has(t.id)
              return (
                <div
                  key={t.id}
                  style={isSelected ? {
                    padding: '2px',
                    background: 'linear-gradient(90deg, #0778ba 0%, #00b4c8 100%)',
                    borderRadius: 12,
                  } : undefined}
                >
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  aria-pressed={isSelected}
                  className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
                    isSelected
                      ? 'rounded-[10px] bg-white'
                      : 'rounded-xl border border-[#e3e3e3] hover:border-[#0778ba]/40'
                  }`}
                >
                  <div
                    className={`mt-0.5 shrink-0 size-4 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-[#0778ba] bg-[#0778ba]' : 'border-[#d4d4d8] bg-white'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <svg viewBox="0 0 10 8" fill="none" className="size-2.5">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-lg font-medium leading-7 ${isSelected ? 'text-[#0778ba]' : 'text-[rgba(0,0,0,0.87)]'}`}>
                        {t.name}
                      </span>
                      {isGoalMatch && (
                        <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-[#07808d] leading-none">
                          GOAL MATCH
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5">{t.description}</p>
                  </div>
                </button>
                </div>
              )
            })}

            {/* ── Unavailable section ── */}
            {ineligibleIds.size > 0 && (
              <>
                <div className="flex items-center gap-3 pt-3">
                  <span className="text-[12px] font-medium tracking-[1.5px] uppercase text-[#71717a] shrink-0">
                    Unavailable
                  </span>
                  <div className="flex-1 h-px bg-[#e4e4e7]" aria-hidden="true" />
                </div>
                <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5">
                  Based on your information, we&rsquo;re unable to offer:
                </p>
                {sortedTreatments.filter(t => ineligibleIds.has(t.id)).map((t) => (
                  <div
                    key={t.id}
                    aria-disabled="true"
                    className="w-full px-4 py-3 rounded-lg border border-[#e3e3e3] flex flex-col gap-1"
                  >
                    <span className="text-lg font-medium leading-7 text-[rgba(0,0,0,0.87)]">
                      {t.name}
                    </span>
                    <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5">{t.description}</p>
                  </div>
                ))}
              </>
            )}
          </div>
          )}

        </div>
      </main>

      {/* ── Sticky CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-12 pt-4"
        style={{
          background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))',
          opacity: done ? 1 : 0,
          pointerEvents: done ? 'auto' : 'none',
          transition: 'opacity 0.5s',
        }}
      >
        <button
          type="button"
          onClick={handleContinue}
          disabled={isNavigating}
          className="
            flex items-center justify-center gap-3
            w-full md:w-[480px] h-[42px] px-4
            rounded-br-[36px] rounded-tl-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
          "
          style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
        >
          Save and continue
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
