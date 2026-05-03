'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'
import { computeBmi } from '@/lib/bmi'
import { getSavedUnitSystem, kgToLbs, lbsToKg } from '@/lib/units'
import {
  getSelectedGoals,
  getNextGoalRoute,
  getPrevGoalRoute,
} from '@/lib/goal-routing'

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

// ─── BMI display label ────────────────────────────────────────────────────────

const BMI_LABEL: Record<string, string> = {
  'Normal weight': 'Healthy',
}

// ─── Copy ─────────────────────────────────────────────────────────────────────

const THIS_ROUTE = '/get-started/questionnaire/q-target-weight'
const QUESTION_TEXT = "What\u2019s your goal weight? *"
const SESSION_INDEX = 50
const PROGRESS = 18

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QTargetWeightPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Compute nav routes synchronously from session (no flash)
  const [backHref, setBackHref] = useState('/get-started/questionnaire/step-3')
  const [nextRoute, setNextRoute] = useState('/get-started/questionnaire/step-4')

  useEffect(() => {
    const goals = getSelectedGoals()
    setBackHref(getPrevGoalRoute(THIS_ROUTE, goals))
    setNextRoute(getNextGoalRoute(THIS_ROUTE, goals))
  }, [])

  // Read the patient's preferred unit system once — it was selected on
  // step-2 and shouldn't change mid-flow. The form input is shown in
  // their unit; we still save canonical lbs (`goalWeight`) for BMI
  // and the backend, plus the original metric value when applicable.
  const units = useMemo(() => getSavedUnitSystem(), [])

  // Pre-fill from saved data on back navigation. In metric mode we
  // restore from `goalWeightKg` so the user sees what they typed; in
  // imperial we restore `goalWeight`.
  const [goalWeight, setGoalWeight] = useState(() => {
    const saved = getStepValues(SESSION_INDEX)
    if (units === 'metric' && typeof saved.goalWeightKg === 'string') return saved.goalWeightKg
    return typeof saved.goalWeight === 'string' ? saved.goalWeight : ''
  })

  // Height from step-2 for live BMI calculation
  const heightVals = useMemo(() => getStepValues(1), [])

  const bmi = useMemo(() => {
    const typed = Number(goalWeight)
    if (!typed || typed <= 0) return null
    // Canonical BMI math runs in imperial; convert kg input to lbs first.
    const lbs = units === 'metric' ? kgToLbs(typed) : typed
    return computeBmi({ ...heightVals, weight: String(lbs) })
  }, [goalWeight, heightVals, units])

  const bmiText = bmi ? `Resulting BMI: ${bmi.value} (${BMI_LABEL[bmi.category] ?? bmi.category})` : null

  useEffect(() => {
    const prior = getPriorSteps(3) // intro + steps 0–2 (last = step-3 health goals)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({ ...last, editHref: '/get-started/questionnaire/step-3' })
    }
  }, [])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  function handleContinue() {
    if (isNavigating) return
    const typed = Number(goalWeight)
    const unitSuffix = units === 'metric' ? 'kg' : 'lbs'
    if (!goalWeight || !typed || typed <= 0 || typed >= 2000) {
      setError(`Please enter a valid goal weight in ${unitSuffix}.`)
      return
    }
    // Compare goal vs current weight in the user's chosen units so the
    // error message matches what they see; convert canonical lbs back
    // to kg for the metric case.
    const currentLbs = Number(heightVals.weight)
    const currentTyped = units === 'metric' ? lbsToKg(currentLbs) : currentLbs
    if (currentTyped > 0 && typed >= currentTyped) {
      setError(`Goal weight must be less than your current weight (${currentTyped} ${unitSuffix}).`)
      return
    }
    setError(null)
    setIsNavigating(true)

    // Save canonical imperial (`goalWeight` in lbs) so BMI + backend
    // code keeps working unchanged. When the user is in metric we also
    // persist `goalWeightKg` for form-roundtrip on back-nav.
    const goalWeightLbs = units === 'metric' ? String(kgToLbs(typed)) : goalWeight
    const bubble = units === 'metric'
      ? `Goal weight: ${goalWeight} kg`
      : `Goal weight: ${goalWeight} lbs`
    const values: Record<string, string> = { goalWeight: goalWeightLbs }
    if (units === 'metric') values.goalWeightKg = goalWeight

    saveStep(
      SESSION_INDEX,
      { question: QUESTION_TEXT.replace(' *', ''), bubbles: [bubble] },
      values,
    )
    router.push(nextRoute)
  }

  return (
    <>
      <BackHeader backHref={backHref} progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className={`overflow-y-auto bg-white focus:outline-none ${done ? "pb-[74px] md:pb-[138px]" : "pb-8"}`}
        style={{ height: 'calc(100dvh - 52px)', marginTop: '52px' }}
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
            <h1
              className="flex-1 min-w-0 text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
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

          {/* ── Form ── */}
          {done && (
            <div className="flex flex-col gap-2 animate-[fadeIn_0.4s_ease_forwards]">
              {/* Input — matches step-2 weight field: h-12 wrapper, spinners
                  visible so the user can step the value up/down. */}
              <div className="flex items-center h-12 rounded-lg border border-[#e4e4e7] bg-white shadow-sm overflow-hidden px-3 focus-within:border-brand-blue transition-colors">
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={999}
                  step={units === 'metric' ? '0.1' : '1'}
                  placeholder=""
                  value={goalWeight}
                  onChange={e => {
                    setGoalWeight(e.target.value)
                    if (error) setError(null)
                  }}
                  className="flex-1 text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] bg-transparent focus:outline-none"
                  aria-label={units === 'metric' ? 'Goal weight in kilograms' : 'Goal weight in pounds'}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'weight-error' : bmiText ? 'bmi-display' : undefined}
                  aria-required="true"
                />
                <span aria-hidden="true" className="text-sm font-semibold text-[#09090b] opacity-50 shrink-0 pl-2">
                  {units === 'metric' ? 'kg (kilograms)' : 'lbs (pounds)'}
                </span>
              </div>

              {/* Live BMI */}
              {bmiText && (
                <p id="bmi-display" className="text-sm font-bold text-brand-blue">
                  {bmiText}
                </p>
              )}

              {/* Validation error */}
              {error && (
                <p id="weight-error" role="alert" className="text-xs text-red-600 leading-4">
                  {error}
                </p>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ── Sticky CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-12 pt-4"
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
            relative w-full md:w-[560px] h-[42px] flex items-center justify-center gap-3 px-4
            overflow-hidden rounded-tl-[36px] rounded-br-[36px]
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
      </div>
    </>
  )
}
