'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import ChatHistory, { type PriorStep, currentStepAnimDuration } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'

// ─── Assets ──────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'

// ─── Icons ───────────────────────────────────────────────────────────────────

function ThumbsUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 shrink-0" aria-hidden="true">
      <path d="M1 8.25a1.25 1.25 0 1 1 2.5 0v7.5a1.25 1.25 0 0 1-2.5 0v-7.5ZM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 14 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 0 1-2.096 6.728C16.422 17.498 15.433 18 14.4 18H9.276a4.5 4.5 0 0 1-1.895-.407L5 16.43V8.64l.138-.064a4.5 4.5 0 0 0 2.361-3.107L8.17 2.67A.75.75 0 0 1 9 2c.98 0 2 .69 2 1Z" />
    </svg>
  )
}

function ThumbsDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 shrink-0" aria-hidden="true">
      <path d="M18.905 12.75a1.25 1.25 0 0 1-2.5 0v-7.5a1.25 1.25 0 0 1 2.5 0v7.5ZM8.905 17v1.3c0 .268-.14.526-.395.607A2 2 0 0 1 5.905 17c0-.995.182-1.948.514-2.826.204-.54-.166-1.174-.744-1.174h-2.52c-1.243 0-2.261-1.01-2.146-2.247.193-2.333.892-4.595 2.096-6.728C3.483 2.502 4.472 2 5.505 2h5.124a4.5 4.5 0 0 1 1.895.407L14.905 3.57v7.79l-.138.064a4.5 4.5 0 0 0-2.361 3.107l-.77 2.897a.75.75 0 0 1-.731.572Z" />
    </svg>
  )
}

// ─── Animation ───────────────────────────────────────────────────────────────

const QUESTION_TEXT = 'How would you rate your sleep quality? *'
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

// ─── Sleep quality options ────────────────────────────────────────────────────

const SLEEP_QUALITY_OPTIONS = [
  { id: 'good', label: 'Good', icon: <ThumbsUpIcon /> },
  { id: 'fair', label: 'Fair', icon: null },
  { id: 'poor', label: 'Poor', icon: <ThumbsDownIcon /> },
] as const

type SleepQualityId = typeof SLEEP_QUALITY_OPTIONS[number]['id']

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 45

// ─── Routes ──────────────────────────────────────────────────────────────────

const NEXT_STEP = '/get-started/questionnaire/step-10'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuestionnaireStep9() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [savedSelection, setSavedSelection] = useState<SleepQualityId | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    const prior = getPriorSteps(8)
    const mapped: PriorStep[] = prior.map((s, i) => ({
      ...s,
      editHref: i === 0 ? '/get-started' : `/get-started/questionnaire${i === 1 ? '' : `/step-${i}`}`,
    }))
    setCurrentStep(mapped[mapped.length - 1] ?? null)

    const saved = getStepValues(8)
    if (typeof saved.sleepQuality === 'string' && saved.sleepQuality) {
      setSavedSelection(saved.sleepQuality as SleepQualityId)
    }
  }, [])

  const currentBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done } =
    useAnimationSequence(currentBubbleCount)

  function handleSelect(opt: typeof SLEEP_QUALITY_OPTIONS[number]) {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      8,
      { question: QUESTION_TEXT, bubbles: [opt.label] },
      { sleepQuality: opt.id }
    )
    router.push(NEXT_STEP)
  }

  return (
    <>
      <IntakeHeader backHref="/get-started/questionnaire/step-8" progress={PROGRESS} />

      <main
        className="overflow-y-auto bg-white"
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
          <div id="main-content" tabIndex={-1} className="flex items-start gap-3 w-full focus:outline-none">
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
                      <span key={i} className={word === '*' ? 'text-red-500' : undefined}>
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
                  WHY WE ASK: Your sleep quality can affect weight, energy, and metabolic health.
                </p>
              )}
            </div>
          </div>

          {/* ── Sleep quality options — tapping navigates immediately ── */}
          {done && (
            <div className="flex flex-col gap-3 animate-[fadeIn_0.4s_ease_forwards]">
              {SLEEP_QUALITY_OPTIONS.map((opt) => {
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
                      className={`
                        w-full h-[42px] flex items-center justify-center gap-2 px-4
                        text-base font-medium transition-colors shadow-sm disabled:opacity-60
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
