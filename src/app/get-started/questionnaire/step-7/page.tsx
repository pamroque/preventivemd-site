'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import ChatHistory, { type PriorStep, currentStepAnimDuration } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'

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

// ─── Animation ───────────────────────────────────────────────────────────────

const QUESTION_TEXT = 'How would you describe your eating habits? *'
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

// ─── Diet options ─────────────────────────────────────────────────────────────

const DIET_OPTIONS = [
  { id: 'takeout', label: 'I often rely on takeout or fast food' },
  { id: 'snacking', label: 'I snack between meals often' },
  { id: 'latenight', label: 'I eat late at night' },
  { id: 'balanced', label: 'I usually eat balanced meals' },
  { id: 'inconsistent', label: 'My eating habits are inconsistent' },
] as const

type DietOptionId = typeof DIET_OPTIONS[number]['id']

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 35

// ─── Routes ──────────────────────────────────────────────────────────────────

const NEXT_STEP = '/get-started/questionnaire/step-8'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuestionnaireStep7() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [selected, setSelected] = useState<Set<DietOptionId>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    const prior = getPriorSteps(6)
    const mapped: PriorStep[] = prior.map((s, i) => ({
      ...s,
      editHref: i === 0 ? '/get-started' : `/get-started/questionnaire${i === 1 ? '' : `/step-${i}`}`,
    }))
    setCurrentStep(mapped[mapped.length - 1] ?? null)

    const saved = getStepValues(6)
    if (typeof saved.diet === 'string' && saved.diet) {
      setSelected(new Set(saved.diet.split(',') as DietOptionId[]))
    }
  }, [])

  const currentBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done } =
    useAnimationSequence(currentBubbleCount)

  function toggle(id: DietOptionId) {
    setError(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleContinue() {
    if (isNavigating) return
    if (selected.size === 0) {
      setError('Please select at least one option.')
      return
    }
    setIsNavigating(true)

    const selectedOptions = DIET_OPTIONS.filter((o) => selected.has(o.id))
    const bubbles = selectedOptions.map((o) => o.label)

    saveStep(
      6,
      { question: QUESTION_TEXT, bubbles },
      { diet: [...selected].join(',') }
    )
    router.push(NEXT_STEP)
  }

  return (
    <>
      <BackHeader backHref="/get-started/questionnaire/step-6" progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className={`overflow-y-auto bg-white focus:outline-none ${done ? "pb-[58px] md:pb-[138px]" : "pb-8"}`}
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 pt-6 md:pt-9">

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
                  WHY WE ASK: Your eating habits can affect which treatments are a good fit for you.
                </p>
              )}
              {error && (
                <p id="diet-error" className="text-sm text-red-600 leading-5" role="alert">{error}</p>
              )}
            </div>
          </div>

          {/* ── Diet options ── */}
          {done && (
            <fieldset
              className="flex flex-col gap-6 border-0 p-0 m-0 animate-[fadeIn_0.4s_ease_forwards]"
              aria-describedby={error ? 'diet-error' : undefined}
            >
              <legend className="sr-only">Select all eating habits that apply</legend>
              {DIET_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex gap-3 items-start cursor-pointer">
                  <div className="flex h-5 items-center justify-center shrink-0 w-4 mt-0.5">
                    <input
                      type="checkbox"
                      checked={selected.has(opt.id)}
                      onChange={() => toggle(opt.id)}
                      className="
                        size-4 rounded-[4px] border border-[#e4e4e7]
                        accent-[#3A5190]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1
                        cursor-pointer
                      "
                    />
                  </div>
                  <span className="text-sm leading-5 text-[#09090b]">{opt.label}</span>
                </label>
              ))}
            </fieldset>
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
            relative flex items-center justify-center gap-3
            w-full md:w-[480px] h-[42px] px-4 overflow-hidden
            rounded-br-[36px] rounded-tl-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
          "
          style={{
            background: 'linear-gradient(90deg, #3A5190 0%, #3A5190 64.61%, #A2D5BC 100%)',
          }}
        >
          {isNavigating ? 'Saving…' : 'Save and continue'}
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
