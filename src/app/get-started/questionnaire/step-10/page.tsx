'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import ChatHistory, { type PriorStep, currentStepAnimDuration } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'

// ─── Assets ──────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'

// ─── Animation ───────────────────────────────────────────────────────────────

const QUESTION_TEXT = 'Are you a professional athlete? *'
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

// ─── Options ─────────────────────────────────────────────────────────────────

const ATHLETE_OPTIONS = [
  { id: 'yes', label: 'Yes' },
  { id: 'no',  label: 'No'  },
] as const

type AthleteId = typeof ATHLETE_OPTIONS[number]['id']

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 42

// ─── Routes ──────────────────────────────────────────────────────────────────

const NEXT_STEP = '/get-started/questionnaire/step-11'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuestionnaireStep10() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [savedSelection, setSavedSelection] = useState<AthleteId | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    const prior = getPriorSteps(9)
    const mapped: PriorStep[] = prior.map((s, i) => ({
      ...s,
      editHref: i === 0 ? '/get-started' : `/get-started/questionnaire${i === 1 ? '' : `/step-${i}`}`,
    }))
    setCurrentStep(mapped[mapped.length - 1] ?? null)

    const saved = getStepValues(9)
    if (saved.athlete === 'yes' || saved.athlete === 'no') {
      setSavedSelection(saved.athlete)
    }
  }, [])

  const currentBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done } =
    useAnimationSequence(currentBubbleCount)

  function handleSelect(opt: typeof ATHLETE_OPTIONS[number]) {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      9,
      { question: QUESTION_TEXT, bubbles: [opt.label] },
      { athlete: opt.id },
    )
    router.push(NEXT_STEP)
  }

  return (
    <>
      <BackHeader backHref="/get-started/questionnaire/step-9" progress={PROGRESS} />

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
        <div className="mx-auto w-full px-4 md:max-w-[560px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

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
              <h1
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
              </h1>
              {done && (
                <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                  WHY WE ASK: This helps your provider tailor treatment recommendations around you.
                </p>
              )}
            </div>
          </div>

          {/* ── Yes / No — tap to continue, no separate "Save and continue" button ── */}
          {done && (
            <div className="flex gap-3 animate-[fadeIn_0.4s_ease_forwards]">
              {ATHLETE_OPTIONS.map((opt) => {
                const isSelected = savedSelection === opt.id
                return (
                  <div
                    key={opt.id}
                    className="flex-1"
                    style={isSelected ? {
                      padding: '2px',
                      background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-mint) 100%)',
                      borderRadius: 8,
                    } : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(opt)}
                      disabled={isNavigating}
                      aria-pressed={isSelected}
                      className={`
                        w-full h-[42px] flex items-center justify-center px-4
                        text-base font-medium transition-colors shadow-sm disabled:opacity-60
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1
                        ${isSelected
                          ? 'rounded-[6px] text-brand-blue bg-white'
                          : 'rounded-lg border border-[#e4e4e7] text-brand-blue bg-white hover:border-brand-blue/40'}
                      `}
                    >
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
