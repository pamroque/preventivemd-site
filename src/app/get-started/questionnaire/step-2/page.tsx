'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
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

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="text-sm text-red-600 mt-1" role="alert">{message}</p>
}

// ─── Word-by-word typing animation ───────────────────────────────────────────

const WORD_DELAY_MS = 80

let questionWords: string[] = []

function buildQuestion(firstName: string) {
  return firstName
    ? `Nice to meet you, ${firstName}. What's your height and weight?`
    : "What's your height and weight?"
}

function useAnimationSequence(currentBubbleCount: number) {
  const [animateBubbles, setAnimateBubbles] = useState(false)
  const [visibleWords, setVisibleWords] = useState(0)
  const [typingStarted, setTypingStarted] = useState(false)
  const [done, setDone] = useState(false)

  // Start bubble animation shortly after mount
  useEffect(() => {
    const t = setTimeout(() => setAnimateBubbles(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Start typing only after the current bubbles have finished animating
  useEffect(() => {
    if (!animateBubbles) return
    const t = setTimeout(() => setTypingStarted(true), currentStepAnimDuration(currentBubbleCount))
    return () => clearTimeout(t)
  }, [animateBubbles, currentBubbleCount])

  useEffect(() => {
    if (!typingStarted) return
    if (visibleWords < questionWords.length) {
      const t = setTimeout(() => setVisibleWords((w) => w + 1), WORD_DELAY_MS)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => setDone(true), 200)
      return () => clearTimeout(t)
    }
  }, [typingStarted, visibleWords])

  return { animateBubbles, visibleWords, typingStarted, done }
}

// ─── Validation ───────────────────────────────────────────────────────────────

const schema = z.object({
  heightFeet: z
    .string()
    .min(1, 'Required')
    .refine((v) => {
      const n = Number(v)
      return Number.isInteger(n) && n >= 3 && n <= 8
    }, 'Enter 3–8'),
  heightInches: z
    .string()
    .min(1, 'Required')
    .refine((v) => {
      const n = Number(v)
      return Number.isInteger(n) && n >= 0 && n <= 11
    }, 'Enter 0–11'),
  weight: z
    .string()
    .min(1, 'Weight is required')
    .refine((v) => {
      const n = Number(v)
      return !isNaN(n) && n > 0 && n < 1000
    }, 'Enter a valid weight in lbs'),
})

type FormValues = z.infer<typeof schema>

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputWrapperCls =
  'flex items-center h-12 rounded-xl border border-[rgba(0,0,0,0.12)] bg-white overflow-hidden ' +
  'focus-within:border-[#0778ba] transition-colors'
const inputErrorCls = 'border-red-600 focus-within:border-red-600'

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 10 // step 2 of ~14 ≈ 10%

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuestionnaireStep2() {
  const router = useRouter()

  // Show only the immediately preceding step's Q&A (no full history)
  const [historicSteps] = useState<PriorStep[]>([])

  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)

  useEffect(() => {
    const prior = getPriorSteps(1)
    const mapped: PriorStep[] = prior.map((s, i) => ({
      ...s,
      editHref: i === 0 ? '/get-started' : `/get-started/questionnaire${i === 1 ? '' : `/step-${i}`}`
    }))
    setCurrentStep(mapped[mapped.length - 1] ?? null)
  }, [])

  // Initialize empty so server/client first render match, then hydrate from
  // sessionStorage after mount — avoids an aria-label hydration mismatch.
  const [firstName, setFirstName] = useState<string>('')

  useEffect(() => {
    const v = getStepValues(0)
    if (typeof v.firstName === 'string') setFirstName(v.firstName)
  }, [])

  // Build question words once first name is known
  const questionText = buildQuestion(firstName)
  questionWords = questionText.split(' ')

  // Only count the current step's bubbles for timing
  const currentBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done } = useAnimationSequence(currentBubbleCount)

  const saved = getStepValues(1)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      heightFeet: typeof saved.heightFeet === 'string' ? saved.heightFeet : '',
      heightInches: typeof saved.heightInches === 'string' ? saved.heightInches : '',
      weight: typeof saved.weight === 'string' ? saved.weight : '',
    },
  })

  async function onSubmit(data: FormValues) {
    const bubbles = [
      `${data.heightFeet}ft ${data.heightInches}in`,
      `${data.weight} lbs`,
    ]
    saveStep(
      1,
      { question: questionText, bubbles },
      { ...data }
    )
    router.push('/get-started/questionnaire/step-3')
  }

  const animatedText = questionWords.slice(0, visibleWords).join(' ')

  return (
    <>
      <IntakeHeader backHref="/get-started/questionnaire" progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto bg-white focus:outline-none"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: '7rem',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

          <ChatHistory
            historicSteps={historicSteps}
            currentStep={currentStep}
            animateCurrentStep={animateBubbles}
          />

          {/* ── Eve's new question — types in ── */}
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
                aria-label={questionText}
              >
                {typingStarted && (
                  <>
                    {/* Render words, highlighting the first name */}
                    {questionWords.slice(0, visibleWords).map((word, i) => {
                      const isName = firstName && word.replace(/[.,!?]/, '') === firstName
                      return (
                        <span key={i} className={isName ? 'text-[#0778ba]' : undefined}>
                          {word}
                          {i < visibleWords - 1 ? ' ' : ''}
                        </span>
                      )
                    })}
                    {visibleWords < questionWords.length && (
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
            <form
              id="step2-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-4 animate-[fadeIn_0.4s_ease_forwards]"
            >
              <fieldset className="flex flex-col border-0 p-0 m-0">
                <legend className="text-sm font-medium text-[rgba(0,0,0,0.87)] mb-1.5">
                  Height <span className="text-red-600" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </legend>
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <div className={`${inputWrapperCls} ${errors.heightFeet ? inputErrorCls : ''}`}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={3}
                        max={8}
                        placeholder=""
                        {...register('heightFeet')}
                        className="flex-1 h-full bg-transparent text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] focus:outline-none border-0 px-3"
                        aria-label="Height in feet"
                        aria-invalid={!!errors.heightFeet}
                        aria-describedby={errors.heightFeet ? 'heightFeet-error' : undefined}
                        aria-required="true"
                      />
                      <span aria-hidden="true" className="pr-3 text-sm font-semibold text-[#09090b] opacity-50 shrink-0 leading-5">
                        feet
                      </span>
                    </div>
                    <FieldError id="heightFeet-error" message={errors.heightFeet?.message} />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className={`${inputWrapperCls} ${errors.heightInches ? inputErrorCls : ''}`}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={11}
                        placeholder=""
                        {...register('heightInches')}
                        className="flex-1 h-full bg-transparent text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] focus:outline-none border-0 px-3"
                        aria-label="Height in inches"
                        aria-invalid={!!errors.heightInches}
                        aria-describedby={errors.heightInches ? 'heightInches-error' : undefined}
                        aria-required="true"
                      />
                      <span aria-hidden="true" className="pr-3 text-sm font-semibold text-[#09090b] opacity-50 shrink-0 leading-5">
                        inches
                      </span>
                    </div>
                    <FieldError id="heightInches-error" message={errors.heightInches?.message} />
                  </div>
                </div>
              </fieldset>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="weight" className="text-sm font-medium text-[rgba(0,0,0,0.87)]">
                  Weight <span className="text-red-600" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <div className={`${inputWrapperCls} !py-0 !px-0 overflow-hidden ${errors.weight ? inputErrorCls : ''}`}>
                  <input
                    id="weight"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={999}
                    placeholder=""
                    {...register('weight')}
                    className="flex-1 h-full bg-transparent text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] focus:outline-none border-0 px-3"
                    aria-label="Weight in pounds"
                    aria-invalid={!!errors.weight}
                    aria-describedby={errors.weight ? 'weight-error' : undefined}
                    aria-required="true"
                  />
                  <span aria-hidden="true" className="pr-3 text-sm font-semibold text-[#09090b] opacity-50 shrink-0 leading-5">
                    lbs (pounds)
                  </span>
                </div>
                <FieldError id="weight-error" message={errors.weight?.message} />
              </div>
            </form>
          )}

        </div>
      </main>{/* end scroll container */}

      {/* ── Sticky CTA — fixed to viewport bottom, appears with the form ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-12 pt-4 transition-all duration-500"
        style={{
          opacity: done ? 1 : 0,
          pointerEvents: done ? 'auto' : 'none',
          background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))',
        }}
      >
        <button
          type="submit"
          form="step2-form"
          disabled={isSubmitting || !done}
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