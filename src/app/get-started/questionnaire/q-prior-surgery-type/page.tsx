'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'
import { getSelectedGoals, getNextGoalRoute } from '@/lib/goal-routing'
import { getSelectedApproaches, getNextApproachRoute, getPrevApproachRoute } from '@/lib/approach-routing'

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

// ─── Copy / config ─────────────────────────────────────────────────────────

const THIS_ROUTE = '/get-started/questionnaire/q-prior-surgery-type'
const QUESTION_TEXT = 'What kind of weight loss surgery did you have? *'
const SESSION_INDEX = 54
const PROGRESS = 20

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QPriorSurgeryTypePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [backHref, setBackHref] = useState('/get-started/questionnaire/q-prior-weight-management')
  const [nextRoute, setNextRoute] = useState('/get-started/questionnaire/step-4')

  useEffect(() => {
    const approaches = getSelectedApproaches()
    const goals = getSelectedGoals()
    const goalFallback = getNextGoalRoute('/get-started/questionnaire/q-prior-weight-management', goals)
    setBackHref(getPrevApproachRoute(THIS_ROUTE, approaches))
    setNextRoute(getNextApproachRoute(THIS_ROUTE, approaches, goalFallback))
  }, [])

  useEffect(() => {
    const saved = getStepValues(SESSION_INDEX)
    if (typeof saved.details === 'string') setDetails(saved.details)
  }, [])

  useEffect(() => {
    const prior = getPriorSteps(SESSION_INDEX)
    const last = prior[prior.length - 1]
    if (last) setCurrentStep({ ...last, editHref: '/get-started/questionnaire/q-prior-weight-management' })
  }, [])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  function handleContinue() {
    if (isNavigating) return
    if (!details.trim()) {
      setError('Please describe the surgery you had')
      return
    }
    setIsNavigating(true)
    saveStep(
      SESSION_INDEX,
      { question: QUESTION_TEXT.replace(' *', ''), bubbles: [details.trim()] },
      { details: details.trim() }
    )
    router.push(nextRoute)
  }

  return (
    <>
      <BackHeader backHref={backHref} progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto bg-white focus:outline-none"
        style={{ height: 'calc(100dvh - 52px)', marginTop: '52px', paddingBottom: '6rem' }}
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
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
                aria-live="polite"
                aria-label={QUESTION_TEXT.replace(' *', '')}
              >
                {typingStarted && (
                  <>
                    {words.slice(0, visibleWords).map((word, i) => (
                      <span key={i} className={word === '*' ? 'text-red-600' : undefined}>
                        {word}{i < visibleWords - 1 ? ' ' : ''}
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

          {/* ── Form ── */}
          {done && (
            <div className="flex flex-col gap-2 animate-[fadeIn_0.4s_ease_forwards]">
              <label htmlFor="surgery-details" className="sr-only">
                What kind of weight loss surgery did you have?
              </label>
              <textarea
                id="surgery-details"
                value={details}
                onChange={e => { setDetails(e.target.value); setError(null) }}
                placeholder="Example: Gastric bypass - Jan 2026"
                rows={4}
                className={`
                  w-full rounded-lg border bg-white px-3 py-2.5
                  text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a]
                  resize-y shadow-sm focus:outline-none transition-colors
                  ${error ? 'border-red-600 focus:border-red-600' : 'border-[rgba(0,0,0,0.12)] focus:border-[#3A5190]'}
                `}
                aria-invalid={!!error}
                aria-describedby={error ? 'surgery-error' : undefined}
                aria-required="true"
              />
              {error && (
                <p id="surgery-error" className="text-sm text-red-600" role="alert">{error}</p>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ── Sticky CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-8 pt-4"
        style={{
          background: 'linear-gradient(to top, white 70%, rgba(255,255,255,0))',
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
            relative w-full md:w-[480px] h-[42px] flex items-center justify-center gap-3 px-4
            overflow-hidden rounded-tl-[36px] rounded-br-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
          "
          style={{ background: 'linear-gradient(90deg, #3A5190 0%, #3A5190 64.61%, #A2D5BC 100%)' }}
        >
          Save and continue
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
