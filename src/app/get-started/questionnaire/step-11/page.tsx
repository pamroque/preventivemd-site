'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import ChatHistory, { type PriorStep, currentStepAnimDuration } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'

// ─── Assets ──────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'

// ─── Icons ───────────────────────────────────────────────────────────────────

function ArrowUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 shrink-0" aria-hidden="true">
      <path fillRule="evenodd"
        d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z"
        clipRule="evenodd" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 shrink-0" aria-hidden="true">
      <path fillRule="evenodd"
        d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Animation ───────────────────────────────────────────────────────────────

const QUESTION_TEXT = 'How would you describe your current stress level? *'
const QUESTION_WORDS = QUESTION_TEXT.split(' ')
const WORD_DELAY_MS = 80

function useAnimationSequence(currentBubbleCount: number) {
  const [animateBubbles, setAnimateBubbles] = useState(false)
  const [visibleWords, setVisibleWords] = useState(0)
  const [typingStarted, setTypingStarted] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimateBubbles(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!animateBubbles) return
    const t = setTimeout(() => setTypingStarted(true), currentStepAnimDuration(currentBubbleCount))
    return () => clearTimeout(t)
  }, [animateBubbles, currentBubbleCount])

  useEffect(() => {
    if (!typingStarted) return
    if (visibleWords < QUESTION_WORDS.length) {
      const t = setTimeout(() => setVisibleWords((w) => w + 1), WORD_DELAY_MS)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => setDone(true), 200)
      return () => clearTimeout(t)
    }
  }, [typingStarted, visibleWords])

  return { animateBubbles, visibleWords, typingStarted, done }
}

// ─── Stress options ───────────────────────────────────────────────────────────

const STRESS_OPTIONS = [
  { id: 'low', label: 'Low', icon: <ArrowDownIcon /> },
  { id: 'moderate', label: 'Moderate', icon: null },
  { id: 'high', label: 'High', icon: <ArrowUpIcon /> },
] as const

type StressId = typeof STRESS_OPTIONS[number]['id']

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 55

// ─── Routes ──────────────────────────────────────────────────────────────────

const NEXT_STEP = '/get-started/questionnaire/visit-type'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuestionnaireStep11() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [savedSelection, setSavedSelection] = useState<StressId | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    const prior = getPriorSteps(10)
    const mapped: PriorStep[] = prior.map((s, i) => ({
      ...s,
      editHref: i === 0 ? '/get-started' : `/get-started/questionnaire${i === 1 ? '' : `/step-${i}`}`,
    }))
    setCurrentStep(mapped[mapped.length - 1] ?? null)

    const saved = getStepValues(10)
    if (typeof saved.stress === 'string' && saved.stress) {
      setSavedSelection(saved.stress as StressId)
    }
  }, [])

  const currentBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done } =
    useAnimationSequence(currentBubbleCount)

  function handleSelect(opt: typeof STRESS_OPTIONS[number]) {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      10,
      { question: QUESTION_TEXT, bubbles: [opt.label] },
      { stress: opt.id }
    )
    router.push(NEXT_STEP)
  }

  return (
    <>
      <IntakeHeader backHref="/get-started/questionnaire/step-10" progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto bg-white focus:outline-none"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: '2rem',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

          <ChatHistory
            historicSteps={[]}
            currentStep={currentStep}
            animateCurrentStep={animateBubbles}
          />

          {/* ── Eve's question ── */}
          <div className="flex items-start gap-3 w-full">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={AVATAR_URL}
                alt="Eve"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <p
                className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
                aria-live="polite"
                aria-label={QUESTION_TEXT}
              >
                {typingStarted && (
                  <>
                    {QUESTION_WORDS.slice(0, visibleWords).map((word, i) => (
                      <span key={i} className={word === '*' ? 'text-red-600' : undefined}>
                        {word}
                        {i < visibleWords - 1 ? ' ' : ''}
                      </span>
                    ))}
                    {visibleWords < QUESTION_WORDS.length && (
                      <span
                        className="inline-block w-[2px] h-[1em] bg-current align-middle ml-[1px] animate-pulse"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </p>
              {done && (
                <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                  WHY WE ASK: Stress can affect your appetite, sleep, energy, and weight.
                </p>
              )}
            </div>
          </div>

          {/* ── Stress options — tapping navigates immediately ── */}
          {done && (
            <div className="flex flex-col gap-3 animate-[fadeIn_0.4s_ease_forwards]">
              {STRESS_OPTIONS.map((opt) => {
                const isSelected = savedSelection === opt.id
                return (
                  <div
                    key={opt.id}
                    style={isSelected ? {
                      padding: '2px',
                      background: 'linear-gradient(90deg, #0778ba 0%, #00b4c8 100%)',
                      borderRadius: 8,
                    } : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(opt)}
                      disabled={isNavigating}
                      aria-pressed={isSelected}
                      className={`
                        w-full h-[42px] flex items-center justify-center gap-2 px-4
                        text-base font-medium transition-colors shadow-sm disabled:opacity-60
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba] focus-visible:ring-offset-1
                        ${isSelected
                          ? 'rounded-[6px] text-[#0778ba] bg-white'
                          : 'rounded-lg border border-[#e4e4e7] text-[#0778ba] bg-white hover:border-[#0778ba]/40'}
                      `}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
