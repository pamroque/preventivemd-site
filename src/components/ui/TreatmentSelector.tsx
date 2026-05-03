'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'
import {
  TREATMENTS,
  PEPTIDE_TO_TREATMENT_ID,
  GOAL_TO_TREATMENTS,
  TREATMENT_INELIGIBILITY,
} from '@/lib/treatments'
import type { Treatment } from '@/lib/treatments'

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

// ─── Description ─────────────────────────────────────────────────────────────

function TreatmentDescription({ treatment, boldFirst }: { treatment: Treatment; boldFirst: boolean }) {
  if (!boldFirst || !treatment.boldFirstSentence) {
    return <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5">{treatment.description}</p>
  }
  const dotIdx = treatment.description.indexOf('. ')
  if (dotIdx === -1) {
    return <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5">{treatment.description}</p>
  }
  const bold = treatment.description.slice(0, dotIdx + 1)
  const rest = treatment.description.slice(dotIdx + 1)
  return (
    <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5">
      <strong className="font-semibold text-[rgba(0,0,0,0.87)]">{bold}</strong>
      {rest}
    </p>
  )
}

// ─── Card variants ────────────────────────────────────────────────────────────

function GradientCard({
  treatment,
  isSelected,
  isGoalMatch,
  onToggle,
}: {
  treatment: Treatment
  isSelected: boolean
  isGoalMatch: boolean
  onToggle: () => void
}) {
  return (
    <div
      style={isSelected ? {
        padding: '2px',
        background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-mint) 100%)',
        borderRadius: 12,
      } : undefined}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isSelected}
        onClick={onToggle}
        className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
          isSelected
            ? 'rounded-[10px] bg-white'
            : 'rounded-xl border border-[#e3e3e3] hover:border-brand-blue/40'
        }`}
      >
        <div
          className={`mt-0.5 shrink-0 size-4 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected ? 'border-brand-blue bg-brand-blue' : 'border-[#d4d4d8] bg-white'
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
            <span className={`text-lg font-medium leading-7 ${isSelected ? 'text-brand-blue' : 'text-[rgba(0,0,0,0.87)]'}`}>
              {treatment.name}
            </span>
            {isGoalMatch && (
              <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-brand-teal leading-none">
                GOAL MATCH
              </span>
            )}
          </div>
          <TreatmentDescription treatment={treatment} boldFirst={true} />
        </div>
      </button>
    </div>
  )
}

function PlainCard({
  treatment,
  isSelected,
  isGoalMatch,
  onToggle,
}: {
  treatment: Treatment
  isSelected: boolean
  isGoalMatch: boolean
  onToggle: () => void
}) {
  return (
    <div
      style={isSelected ? {
        padding: '2px',
        background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-mint) 100%)',
        borderRadius: 12,
      } : undefined}
    >
      <label
        className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors bg-white ${
          isSelected
            ? 'rounded-[10px]'
            : 'rounded-lg border border-[#e3e3e3] hover:border-brand-blue/40'
        }`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="
            shrink-0 size-4 rounded-[4px] border border-[#e4e4e7]
            accent-brand-blue
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1
            cursor-pointer
          "
        />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[18px] font-medium leading-7 text-[rgba(0,0,0,0.87)]">
              {treatment.name}
            </span>
            {isGoalMatch && (
              <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-brand-teal leading-none">
                GOAL MATCH
              </span>
            )}
          </div>
          <TreatmentDescription treatment={treatment} boldFirst={true} />
        </div>
      </label>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TreatmentSelectorProps {
  questionText: string
  stepIndex: number
  backHref: string
  nextHref: string
  progress: number
  priorStepEditHref: string
  /** When true, reads step-5 conditions and hides/disqualifies ineligible treatments */
  checkIneligibility?: boolean
  /** When set, renders an escape button with this label that saves an empty selection */
  escapeLabel?: string
  /** 'gradient' = custom checkbox + gradient border (request flow); 'plain' = native checkbox (consult flow) */
  cardVariant: 'gradient' | 'plain'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TreatmentSelector({
  questionText,
  stepIndex,
  backHref,
  nextHref,
  progress,
  priorStepEditHref,
  checkIneligibility = false,
  escapeLabel,
  cardVariant,
}: TreatmentSelectorProps) {
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
    // Ineligibility check (request flow only)
    const ineligible = new Set<string>()
    if (checkIneligibility) {
      // Disqualifiers can be a step-5 condition, a step-6 medication,
      // a step-8 alcohol bracket, or a yes-answer on a binary question
      // further down the flow (currently just step-10 athlete). We
      // union them all into one flat lookup set; the namespaces don't
      // collide.
      const conditionsVal  = getStepValues(4).conditions
      const medicationsVal = getStepValues(5).medications
      const alcoholVal     = getStepValues(7).alcohol
      const athleteVal     = getStepValues(9).athlete
      const blockerInputs = new Set<string>([
        ...(typeof conditionsVal  === 'string' && conditionsVal  ? conditionsVal.split(',')  : []),
        ...(typeof medicationsVal === 'string' && medicationsVal ? medicationsVal.split(',') : []),
        ...(typeof alcoholVal     === 'string' && alcoholVal     ? [`alcohol-${alcoholVal}`] : []),
        ...(athleteVal === 'yes' ? ['athlete'] : []),
      ])
      TREATMENTS.forEach(t => {
        const blockers = TREATMENT_INELIGIBILITY[t.id]
        if (blockers && blockers.some(c => blockerInputs.has(c))) ineligible.add(t.id)
      })
      if (TREATMENTS.every(t => ineligible.has(t.id))) {
        router.replace('/get-started/questionnaire/disqualification')
        return
      }
    }
    setIneligibleIds(ineligible)

    // Pre-selection from /treatments/[slug] entry point
    const intro = getStepValues(99)
    const peptide = typeof intro.peptide === 'string' ? intro.peptide : ''
    const mapped = peptide ? PEPTIDE_TO_TREATMENT_ID[peptide] ?? null : null
    const preId = mapped && !ineligible.has(mapped) ? mapped : null
    setPreCheckedId(preId)

    // Restore prior selection on back navigation
    const saved = getStepValues(stepIndex)
    let restored: string[] | null = null
    if (typeof saved.treatments === 'string' && saved.treatments) {
      try {
        const parsed = JSON.parse(saved.treatments) as string[]
        const valid = Array.isArray(parsed)
          ? parsed.filter(id => !ineligible.has(id))
          : []
        if (valid.length > 0) restored = valid
      } catch { /* ignore */ }
    }
    if (restored) {
      setSelected(new Set(restored))
      setShowPreCheckedNote(false)
    } else if (preId) {
      setSelected(new Set([preId]))
    }

    // GOAL MATCH badge from step-3 health goals
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

    // Prior step bubble
    const prior = getPriorSteps(stepIndex)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({ ...last, editHref: priorStepEditHref })
    }
  }, [router, stepIndex, priorStepEditHref, checkIneligibility])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(questionText, priorBubbleCount)

  const sortedTreatments = useMemo(() => {
    // Order within "eligible":
    //   1. Pre-checked treatment (from /treatments/[slug] entry point)
    //   2. Treatments tagged GOAL MATCH — alphabetical among themselves
    //   3. Everything else — alphabetical
    const alpha = [...TREATMENTS].sort((a, b) => a.name.localeCompare(b.name))
    const ineligible = alpha.filter(t => ineligibleIds.has(t.id))
    const eligibleAlpha = alpha.filter(t => !ineligibleIds.has(t.id))
    const goalMatched = eligibleAlpha.filter(t => goalMatchedIds.has(t.id))
    const others = eligibleAlpha.filter(t => !goalMatchedIds.has(t.id))
    const eligible = [...goalMatched, ...others]
    if (preCheckedId) {
      const idx = eligible.findIndex(t => t.id === preCheckedId)
      if (idx > 0) {
        const [pre] = eligible.splice(idx, 1)
        eligible.unshift(pre)
      }
    }
    return { eligible, ineligible }
  }, [preCheckedId, goalMatchedIds, ineligibleIds])

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

  function handleEscape() {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      stepIndex,
      { question: questionText, bubbles: [escapeLabel!] },
      { treatments: JSON.stringify([]) },
    )
    router.push(nextHref)
  }

  function handleContinue() {
    if (isNavigating) return
    if (selected.size === 0) {
      setShowEmptyError(true)
      return
    }
    setIsNavigating(true)
    // Save in the same order the user actually saw the treatments — so
    // the next page (choose-medications / desired-treatments / etc.)
    // can render the picks in matching order without re-sorting.
    const orderedSelected = sortedTreatments.eligible.filter(t => selected.has(t.id))
    saveStep(
      stepIndex,
      { question: questionText, bubbles: orderedSelected.map(t => t.name) },
      { treatments: JSON.stringify(orderedSelected.map(t => t.id)) },
    )
    router.push(nextHref)
  }

  const hasSelection = selected.size > 0
  // Sticky CTA shows as soon as Eve finishes typing — even before any
  // treatment is checked. Clicking "Save and continue" with nothing
  // selected raises `showEmptyError`, which renders the inline message
  // above the picker (and references the escape option when one exists).
  const showStickyCta = done

  return (
    <>
      <BackHeader backHref={backHref} progress={progress} />

      <main
        id="main-content"
        tabIndex={-1}
        className={`overflow-y-auto bg-white focus:outline-none ${showStickyCta ? 'pb-[74px] md:pb-[138px]' : 'pb-8'}`}
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[560px] md:px-0 flex flex-col gap-6 md:gap-9 pt-6 md:pt-9">

          <ChatHistory
            historicSteps={[]}
            currentStep={currentStep}
            animateCurrentStep={animateBubbles}
          />

          {/* ── Eve's question ── */}
          <div className="flex items-start gap-3 w-full">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <h1
                className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
                aria-live="polite"
                aria-label={questionText}
              >
                {typingStarted && (
                  <>
                    {words.slice(0, visibleWords).map((word, i) => (
                      <span key={i} className={word === '*' ? 'text-red-600' : undefined}>
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
              {done && preCheckedId && showPreCheckedNote && (
                <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                  {TREATMENTS.find(t => t.id === preCheckedId)?.name ?? preCheckedId} has been pre-checked based on your initial interest.
                </p>
              )}
              {done && showEmptyError && (
                <p id="treatments-error" role="alert" className="text-sm leading-5 text-red-600">
                  {escapeLabel
                    ? `Please select at least one treatment, or choose \u201c${escapeLabel}.\u201d`
                    : 'Please check at least one treatment'}
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
              {escapeLabel && (
                <button
                  type="button"
                  onClick={handleEscape}
                  disabled={isNavigating}
                  className="
                    w-full h-[42px] flex items-center justify-center px-4
                    rounded-lg border border-brand-blue bg-white
                    text-base font-medium text-brand-blue
                    transition-colors hover:bg-brand-blue/5
                    disabled:opacity-60
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1
                  "
                >
                  {escapeLabel}
                </button>
              )}

              {sortedTreatments.eligible.map((t) => {
                const isSelected = selected.has(t.id)
                const isGoalMatch = goalMatchedIds.has(t.id)
                return cardVariant === 'gradient' ? (
                  <GradientCard
                    key={t.id}
                    treatment={t}
                    isSelected={isSelected}
                    isGoalMatch={isGoalMatch}
                    onToggle={() => toggle(t.id)}
                  />
                ) : (
                  <PlainCard
                    key={t.id}
                    treatment={t}
                    isSelected={isSelected}
                    isGoalMatch={isGoalMatch}
                    onToggle={() => toggle(t.id)}
                  />
                )
              })}

              {/* Unavailable section (request flow only) */}
              {sortedTreatments.ineligible.length > 0 && (
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
                  {sortedTreatments.ineligible.map((t) => (
                    <div
                      key={t.id}
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
          opacity: showStickyCta ? 1 : 0,
          pointerEvents: showStickyCta ? 'auto' : 'none',
          transition: 'opacity 0.5s',
          background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))',
        }}
      >
        <button
          type="button"
          onClick={handleContinue}
          disabled={isNavigating}
          className="
            flex items-center justify-center gap-3
            w-full md:w-[560px] h-[42px] px-4
            rounded-br-[36px] rounded-tl-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
          "
          style={{ background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-blue) 64.61%, var(--brand-mint) 100%)' }}
        >
          {isNavigating ? 'Saving…' : 'Save and continue'}
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
