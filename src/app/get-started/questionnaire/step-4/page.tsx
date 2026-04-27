'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import ChatHistory, { type PriorStep, currentStepAnimDuration } from '@/components/ui/ChatHistory'
import { getLastAnsweredStep, getStepValues, saveStep } from '@/lib/intake-session-store'
import { getStep4BackHref } from '@/lib/goal-routing'
import { usePrefersReducedMotion } from '@/lib/useEveTyping'

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

const QUESTION_TEXT = 'Has your weight changed significantly in the past 1 year? *'
const QUESTION_WORDS = QUESTION_TEXT.split(' ')
const WORD_DELAY_MS = 80

function useAnimationSequence(currentBubbleCount: number) {
  const reducedMotion = usePrefersReducedMotion()
  const [animateBubbles, setAnimateBubbles] = useState(false)
  const [visibleWords, setVisibleWords] = useState(0)
  const [typingStarted, setTypingStarted] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!reducedMotion) return
    setAnimateBubbles(true)
    setTypingStarted(true)
    setVisibleWords(QUESTION_WORDS.length)
    setDone(true)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    const t = setTimeout(() => setAnimateBubbles(true), 100)
    return () => clearTimeout(t)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    if (!animateBubbles) return
    const t = setTimeout(() => setTypingStarted(true), currentStepAnimDuration(currentBubbleCount))
    return () => clearTimeout(t)
  }, [reducedMotion, animateBubbles, currentBubbleCount])

  useEffect(() => {
    if (reducedMotion) return
    if (!typingStarted) return
    if (visibleWords < QUESTION_WORDS.length) {
      const t = setTimeout(() => setVisibleWords((w) => w + 1), WORD_DELAY_MS)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => setDone(true), 200)
      return () => clearTimeout(t)
    }
  }, [reducedMotion, typingStarted, visibleWords])

  return { animateBubbles, visibleWords, typingStarted, done }
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="text-sm text-red-600 mt-1" role="alert">{message}</p>
}

// ─── Validation ───────────────────────────────────────────────────────────────

const schema = z.object({
  weightLost: z
    .string()
    .min(1, 'Required')
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) > 0 && Number(v) < 2000,
      'Enter a valid weight in lbs'
    ),
  intentional: z.enum(['yes', 'no'], { required_error: 'Please select one' }),
})

type FormValues = z.infer<typeof schema>

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputWrapperCls =
  'flex items-center h-[42px] rounded-xl border border-[rgba(0,0,0,0.12)] bg-white overflow-hidden ' +
  'focus-within:border-[#0778ba] transition-colors'

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 20

// ─── Next step ───────────────────────────────────────────────────────────────
// Both "Yes" and "No / Not sure" paths lead to Conditions.
// When the "Lose weight" goal path is implemented, screens before this step
// will route here after GLP-1 and prior weight management questions.
const NEXT_STEP = '/get-started/questionnaire/step-5'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuestionnaireStep4() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [backHref, setBackHref] = useState('/get-started/questionnaire/step-3')

  useEffect(() => {
    // Compute on the client — sessionStorage is unavailable during SSR, so
    // initializing these in useState would always fall through to step-3.
    const prev = getStep4BackHref()
    setBackHref(prev)
    const last = getLastAnsweredStep()
    if (last) setCurrentStep({ ...last, editHref: prev })
  }, [])

  const saved = getStepValues(3)
  const savedSelection =
    saved.weightChanged === 'yes' ? 'yes' : saved.weightChanged === 'no' ? 'no' : null

  const currentBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done } =
    useAnimationSequence(currentBubbleCount)

  const [selection, setSelection] = useState<'yes' | 'no' | null>(savedSelection)
  const [isNavigating, setIsNavigating] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      weightLost: typeof saved.weightLost === 'string' ? saved.weightLost : '',
      intentional: (saved.intentional as 'yes' | 'no' | undefined) ?? undefined,
    },
  })

  const intentionalValue = watch('intentional')

  function handleNo() {
    if (isNavigating) return
    setIsNavigating(true)
    setSelection('no')
    saveStep(
      3,
      { question: QUESTION_TEXT, bubbles: ['No / Not sure'] },
      { weightChanged: 'no' }
    )
    router.push(NEXT_STEP)
  }

  async function onSubmit(data: FormValues) {
    const bubbles = [
      'Yes',
      `${data.weightLost} lbs lost`,
      data.intentional === 'yes' ? 'Intentional' : 'Unintentional',
    ]
    saveStep(
      3,
      { question: QUESTION_TEXT, bubbles },
      { weightChanged: 'yes', weightLost: data.weightLost, intentional: data.intentional }
    )
    router.push(NEXT_STEP)
  }

  const showExpanded = done && selection === 'yes'

  return (
    <>
      <BackHeader backHref={backHref} progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto bg-white focus:outline-none"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: showExpanded ? '7rem' : '2rem',
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
            </div>
          </div>

          {/* ── Yes / No / Not sure buttons ── */}
          {done && (
            <div className="flex gap-3 animate-[fadeIn_0.4s_ease_forwards]">
              {(['yes', 'no'] as const).map((opt) => (
                <div
                  key={opt}
                  className="flex-1"
                  style={selection === opt ? {
                    padding: '2px',
                    background: 'linear-gradient(90deg, #0778ba 0%, #00b4c8 100%)',
                    borderRadius: 8,
                  } : undefined}
                >
                  <button
                    type="button"
                    onClick={opt === 'yes' ? () => setSelection('yes') : handleNo}
                    disabled={isNavigating}
                    className={`
                      w-full h-[42px] flex items-center justify-center px-4 text-base font-medium
                      transition-colors shadow-sm disabled:opacity-60
                      ${selection === opt
                        ? 'rounded-[6px] text-[#0778ba] bg-white'
                        : 'rounded-lg border border-[#e4e4e7] text-[#09090b] bg-white hover:border-[#0778ba]/40'}
                    `}
                  >
                    {opt === 'yes' ? 'Yes' : 'No / Not sure'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Expanded form — only when "Yes" selected ── */}
          {showExpanded && (
            <form
              id="step4-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-4 animate-[fadeIn_0.4s_ease_forwards]"
            >
              {/* Weight lost */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="weightLost" className="text-sm font-medium text-[rgba(0,0,0,0.87)]">
                  Weight lost <span className="text-red-600" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <div className={`${inputWrapperCls} ${errors.weightLost ? 'border-red-600 focus-within:border-red-600' : ''}`}>
                  <input
                    id="weightLost"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={1999}
                    placeholder="Estimate is fine"
                    {...register('weightLost')}
                    className="flex-1 h-full bg-transparent text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] focus:outline-none border-0 px-3"
                    aria-invalid={!!errors.weightLost}
                    aria-describedby={errors.weightLost ? 'weightLost-error' : undefined}
                    aria-required="true"
                  />
                  <span aria-hidden="true" className="pr-3 text-sm font-semibold text-[#09090b] opacity-50 shrink-0 leading-5">
                    lbs (pounds)
                  </span>
                </div>
                <FieldError id="weightLost-error" message={errors.weightLost?.message} />
              </div>

              {/* Was it intentional? */}
              <fieldset
                className="flex flex-col border-0 p-0 m-0"
                aria-describedby={errors.intentional ? 'intentional-error' : undefined}
              >
                <legend className="text-sm font-medium text-[rgba(0,0,0,0.87)] mb-1.5">
                  Was it intentional? <span className="text-red-600" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </legend>
                <div role="radiogroup" aria-label="Was it intentional?" className="flex gap-3">
                  {(['yes', 'no'] as const).map((opt) => {
                    const isSelected = intentionalValue === opt
                    return (
                      <label
                        key={opt}
                        className="flex-1 cursor-pointer"
                        style={isSelected ? {
                          padding: '2px',
                          background: 'linear-gradient(90deg, #0778ba 0%, #00b4c8 100%)',
                          borderRadius: 8,
                        } : undefined}
                      >
                        <input
                          type="radio"
                          name="intentional"
                          value={opt}
                          checked={isSelected}
                          onChange={() => setValue('intentional', opt, { shouldValidate: true })}
                          className="peer sr-only"
                        />
                        <span
                          className={`
                            w-full h-[42px] flex items-center justify-center px-4 text-base font-medium
                            transition-colors shadow-sm
                            peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-[#0778ba]
                            ${isSelected
                              ? 'rounded-[6px] text-[#0778ba] bg-white'
                              : 'rounded-lg border border-[#e4e4e7] text-[#09090b] bg-white hover:border-[#0778ba]/40'}
                          `}
                        >
                          {opt === 'yes' ? 'Yes' : 'No'}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <FieldError id="intentional-error" message={errors.intentional?.message} />
              </fieldset>
            </form>
          )}

        </div>
      </main>

      {/* ── Sticky CTA — only shown for the "Yes" path ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-12 pt-4 transition-all duration-500"
        style={{
          opacity: showExpanded ? 1 : 0,
          pointerEvents: showExpanded ? 'auto' : 'none',
          background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))',
        }}
      >
        <button
          type="submit"
          form="step4-form"
          disabled={isSubmitting || !showExpanded}
          className="
            relative flex items-center justify-center gap-3
            w-full md:w-[480px] h-[42px] px-4 overflow-hidden
            rounded-br-[36px] rounded-tl-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
          "
          style={{
            background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)',
          }}
        >
          {isSubmitting ? 'Saving…' : 'Save and continue'}
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
