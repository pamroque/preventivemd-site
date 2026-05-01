'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import ChatHistory, { type PriorStep, currentStepAnimDuration } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { computeBmi } from '@/lib/bmi'
import { clearGoalQuestionData, getFirstGoalQuestionRoute } from '@/lib/goal-routing'
import { usePrefersReducedMotion } from '@/lib/useEveTyping'

// ─── Assets ──────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'

// ─── Icons (heroicons-outline, 36px per Figma) ───────────────────────────────

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

function GlobeAltIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className="size-9 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.038 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.038-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className="size-9 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className="size-9 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3.75 13.5 10.5 4.5 9 12h5.25L9.75 21l1.5-7.5H3.75Z" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className="size-9 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12c0 5.25-9 9.75-9 9.75S3 17.25 3 12c0-.512.034-1.017.1-1.512A12.003 12.003 0 0 0 12 2.25a12.003 12.003 0 0 0 8.9 8.238c.066.495.1 1 .1 1.512Z" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className="size-9 shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
      className="size-3" aria-hidden="true">
      <path fillRule="evenodd"
        d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Word-by-word typing ──────────────────────────────────────────────────────

const QUESTION_TEXT = 'What health goals would you like to work toward? *'
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

// ─── Goal options ────────────────────────────────────────────────────────────

type GoalId =
  | 'weight'
  | 'sleep'
  | 'stress'
  | 'energy'
  | 'focus'
  | 'aging'
  | 'inflammation'
  | 'recovery'
  | 'sexual'
  | 'other'

interface GoalOption {
  id: GoalId
  label: string
  Icon?: () => React.ReactElement
}

const PEPTIDE_TO_GOAL: Record<string, GoalId> = {
  Semaglutide: 'weight',
  Tirzepatide: 'weight',
  'NAD+': 'energy',
  Sermorelin: 'recovery',
  Glutathione: 'energy',
  'GHK-Cu': 'inflammation',
}

const GOALS: GoalOption[] = [
  { id: 'weight', label: 'Support healthy weight management', Icon: GlobeAltIcon },
  { id: 'sleep', label: 'Improve sleep quality', Icon: MoonIcon },
  { id: 'stress', label: 'Reduce stress and anxious feelings', Icon: GlobeAltIcon },
  { id: 'energy', label: 'Improve energy', Icon: BoltIcon },
  { id: 'focus', label: 'Improve focus and mental clarity', Icon: GlobeAltIcon },
  { id: 'aging', label: 'Support healthy aging', Icon: GlobeAltIcon },
  { id: 'inflammation', label: 'Reduce inflammation and support healing', Icon: ShieldCheckIcon },
  { id: 'recovery', label: 'Improve recovery and physical performance', Icon: HeartIcon },
  { id: 'sexual', label: 'Improve sexual wellness', Icon: HeartIcon },
  { id: 'other', label: 'Others' },
]

// ─── Validation ───────────────────────────────────────────────────────────────

const schema = z
  .object({
    goals: z.array(z.string()).min(1, 'Please check at least one goal.'),
    otherText: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.goals.includes('other') && !data.otherText?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherText'],
        message: 'Please specify your other health goal',
      })
    }
  })

type FormValues = z.infer<typeof schema>

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 15 // step 3 of ~14 ≈ 15%

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuestionnaireStep3() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [showPreNote, setShowPreNote] = useState(false)
  const [preNoteName, setPreNoteName] = useState('')
  const [orderedGoals, setOrderedGoals] = useState<GoalOption[]>(GOALS)

  // BMI is derived from step 2's saved values
  const bmi = useMemo(() => computeBmi(getStepValues(1)), [])

  const saved = getStepValues(2)
  const savedGoals = Array.isArray(saved.goals)
    ? (saved.goals as unknown as string[])
    : typeof saved.goals === 'string'
      ? (saved.goals as string).split(',').filter(Boolean)
      : []
  const savedOther = typeof saved.otherText === 'string' ? saved.otherText : ''

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      goals: savedGoals,
      otherText: savedOther,
    },
  })

  useEffect(() => {
    const prior = getPriorSteps(2)
    const mapped: PriorStep[] = prior.map((s, i) => ({
      ...s,
      editHref: i === 0 ? '/get-started' : `/get-started/questionnaire${i === 1 ? '' : `/step-${i}`}`,
    }))
    setCurrentStep(mapped[mapped.length - 1] ?? null)

    // Pre-select goal based on treatment the user started from, only if they
    // haven't already answered this step.
    if (savedGoals.length === 0) {
      const intro = getStepValues(99)
      const peptide = typeof intro.peptide === 'string' ? intro.peptide : ''
      const preGoal = peptide ? PEPTIDE_TO_GOAL[peptide] : undefined
      if (preGoal) {
        setValue('goals', [preGoal], { shouldValidate: false })
        setPreNoteName(peptide)
        setShowPreNote(true)
        setOrderedGoals([
          ...GOALS.filter((g) => g.id === preGoal),
          ...GOALS.filter((g) => g.id !== preGoal),
        ])
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedGoals = watch('goals') ?? []
  const otherChecked = selectedGoals.includes('other')

  function toggleGoal(id: GoalId) {
    setShowPreNote(false)
    const next = selectedGoals.includes(id)
      ? selectedGoals.filter((g) => g !== id)
      : [...selectedGoals, id]
    setValue('goals', next, { shouldValidate: true })
  }

  const currentBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done } = useAnimationSequence(currentBubbleCount)

  async function onSubmit(data: FormValues) {
    const labels = data.goals
      .map((id) => GOALS.find((g) => g.id === id)?.label)
      .filter((l): l is string => !!l)
    const bubbles =
      data.goals.includes('other') && data.otherText?.trim()
        ? [...labels.filter((l) => l !== 'Others'), `Other: ${data.otherText.trim()}`]
        : labels
    clearGoalQuestionData()
    saveStep(
      2,
      { question: QUESTION_TEXT, bubbles },
      { goals: data.goals.join(','), otherText: data.otherText ?? '' },
    )
    router.push(getFirstGoalQuestionRoute(data.goals))
  }

  return (
    <>
      <BackHeader backHref="/get-started/questionnaire/step-2" progress={PROGRESS} />

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
            historicSteps={[]}
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
              {done && showPreNote && preNoteName && (
                <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                  The first goal has been pre-checked based on your initial interest in {preNoteName}.
                </p>
              )}
              {errors.goals && (
                <p
                  id="goals-error"
                  className="text-sm text-red-600 leading-5"
                  role="alert"
                >
                  {errors.goals.message}
                </p>
              )}
            </div>
          </div>

          {/* ── Form ── */}
          {done && (
            <form
              id="step3-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-4 animate-[fadeIn_0.4s_ease_forwards]"
            >
              <fieldset
                className="flex flex-col gap-4 border-0 p-0 m-0"
                aria-describedby={errors.goals ? 'goals-error' : undefined}
              >
                <legend className="sr-only">{QUESTION_TEXT}</legend>

                {orderedGoals.map((goal) => {
                  const checked = selectedGoals.includes(goal.id)
                  const showBmi = goal.id === 'weight' && bmi?.isOverweightOrAbove
                  return (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      checked={checked}
                      onToggle={() => toggleGoal(goal.id)}
                      subtext={
                        showBmi
                          ? `Your body mass index (BMI) is ${bmi!.value} (${bmi!.category})`
                          : undefined
                      }
                    />
                  )
                })}
              </fieldset>

              {/* ── Conditional "Please specify" textarea — only when Others is checked ── */}
              {otherChecked && (
                <div className="flex flex-col gap-1.5 animate-[fadeIn_0.3s_ease_forwards]">
                  <label
                    htmlFor="otherText"
                    className="text-sm font-medium text-[rgba(0,0,0,0.87)]"
                  >
                    Please specify <span className="text-red-600" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <textarea
                    id="otherText"
                    rows={3}
                    {...register('otherText')}
                    className={`
                      w-full min-h-[99px] px-3 py-1.5 bg-white border rounded-lg shadow-sm
                      text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a]
                      focus:outline-none transition-colors resize-y
                      ${errors.otherText ? 'border-red-600 focus:border-red-600' : 'border-[#e4e4e7] focus:border-[#3A5190]'}
                    `}
                    aria-invalid={!!errors.otherText}
                    aria-describedby={errors.otherText ? 'otherText-error' : undefined}
                    aria-required="true"
                  />
                  {errors.otherText && (
                    <p id="otherText-error" className="text-xs text-red-600 leading-4" role="alert">
                      {errors.otherText.message}
                    </p>
                  )}
                </div>
              )}
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
          form="step3-form"
          disabled={isSubmitting || !done}
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
          {isSubmitting ? 'Saving…' : 'Save and continue'}
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}

// ─── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  checked,
  onToggle,
  subtext,
}: {
  goal: GoalOption
  checked: boolean
  onToggle: () => void
  subtext?: string
}) {
  const { Icon } = goal

  return (
    <div
      className="rounded-lg"
      style={checked ? {
        padding: '2px',
        background: 'linear-gradient(90deg, #3A5190 0%, #A2D5BC 100%)',
      } : undefined}
    >
    <label
      className={`
        flex items-center gap-4 md:gap-6 px-4 py-3 bg-white cursor-pointer
        transition-colors
        focus-within:ring-2 focus-within:ring-[#3b82f6] focus-within:ring-offset-1
        ${checked
          ? 'rounded-[6px]'
          : 'rounded-lg border border-[#e3e3e3] hover:border-[#3A5190]/40'}
      `}
    >
      <span className="flex h-5 items-center shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="sr-only"
          aria-labelledby={`${goal.id}-label`}
          aria-describedby={subtext ? `${goal.id}-desc` : undefined}
        />
        <span
          className={`
            relative flex items-center justify-center size-4 rounded shrink-0 transition-colors
            ${checked
              ? 'bg-[#3A5190] border border-[#3A5190] text-white'
              : 'bg-white border border-[#e4e4e7]'}
          `}
          aria-hidden="true"
        >
          {checked && <CheckIcon />}
        </span>
      </span>

      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span
          id={`${goal.id}-label`}
          className={`text-base font-medium leading-6 ${
            checked ? 'text-[#3A5190]' : 'text-[rgba(0,0,0,0.87)]'
          }`}
        >
          {goal.label}
        </span>
        {subtext && (
          <span id={`${goal.id}-desc`} className="text-sm font-bold leading-5 text-[#3A5190]">
            {subtext}
          </span>
        )}
      </span>

      {Icon && (
        <span className="text-[#71717a] shrink-0">
          <Icon />
        </span>
      )}
    </label>
    </div>
  )
}
