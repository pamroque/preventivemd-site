'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
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

function ChevronUpDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 shrink-0 text-[rgba(0,0,0,0.4)]" aria-hidden="true">
      <path fillRule="evenodd"
        d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3ZM10 17a.75.75 0 0 1-.55-.24l-3.25-3.5a.75.75 0 1 1 1.1-1.02L10 15.148l2.7-2.908a.75.75 0 1 1 1.1 1.02l-3.25 3.5A.75.75 0 0 1 10 17Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Data ────────────────────────────────────────────────────────────────────

const GLP1_OPTIONS = [
  { value: 'wegovy',   label: 'Wegovy\u00ae (semaglutide)' },
  { value: 'ozempic',  label: 'Ozempic\u00ae (semaglutide)' },
  { value: 'zepbound', label: 'Zepbound\u00ae (tirzepatide)' },
  { value: 'mounjaro', label: 'Mounjaro\u00ae (tirzepatide)' },
  { value: 'saxenda',  label: 'Saxenda\u00ae (liraglutide)' },
  { value: 'rybelsus', label: 'Rybelsus\u00ae (oral semaglutide)' },
  { value: 'other',    label: 'Other' },
]

const HOW_TAKEN_OPTIONS = [
  { value: 'weekly-injection',    label: 'Weekly injection' },
  { value: 'biweekly-injection',  label: 'Bi-weekly injection' },
  { value: 'daily-injection',     label: 'Daily injection' },
  { value: 'oral',                label: 'Oral tablet' },
]

const DOSAGE_OPTIONS = [
  '0.25 mg', '0.5 mg', '1 mg', '1.7 mg', '2 mg', '2.4 mg',
  '2.5 mg', '5 mg', '7.5 mg', '10 mg', '12.5 mg', '15 mg', 'Other',
]

const TIME_OPTIONS = ['0-7-days', '8-14-days', '15-30-days', '30-plus-days'] as const
type TimeSinceLastDose = typeof TIME_OPTIONS[number]
const TIME_LABELS: Record<TimeSinceLastDose, string> = {
  '0-7-days':     '0\u20137 days',
  '8-14-days':    '8\u201314 days',
  '15-30-days':   '15\u201330 days',
  '30-plus-days': '30+ days',
}

// ─── Validation ───────────────────────────────────────────────────────────────

const schema = z.object({
  glp1Name:          z.string().min(1, 'Required'),
  howTaken:          z.string().optional(),
  dosage:            z.string().optional(),
  timeSinceLastDose: z.enum(TIME_OPTIONS, { required_error: 'Required' }),
})

type FormValues = z.infer<typeof schema>

// ─── Shared styles ────────────────────────────────────────────────────────────

const selectWrapperCls =
  'relative flex items-center h-[42px] rounded-xl border border-[rgba(0,0,0,0.12)] bg-white overflow-hidden shadow-sm'

// ─── Copy / config ────────────────────────────────────────────────────────────

const THIS_ROUTE = '/get-started/questionnaire/q-prior-glp1-history'
const QUESTION_TEXT = 'Please share details about the GLP-1 medication you are or were taking.'
const SESSION_INDEX = 52
const PROGRESS = 20

// ─── Field error ─────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-red-500 mt-1" role="alert">{message}</p>
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QPriorGlp1HistoryPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  const [backHref, setBackHref] = useState('/get-started/questionnaire/q-prior-weight-management')
  const [nextRoute, setNextRoute] = useState('/get-started/questionnaire/q-prior-glp1-reactions')

  useEffect(() => {
    const approaches = getSelectedApproaches()
    const goals = getSelectedGoals()
    const goalFallback = getNextGoalRoute('/get-started/questionnaire/q-prior-weight-management', goals)
    setBackHref(getPrevApproachRoute(THIS_ROUTE, approaches))
    setNextRoute(getNextApproachRoute(THIS_ROUTE, approaches, goalFallback))
  }, [])

  useEffect(() => {
    const prior = getPriorSteps(SESSION_INDEX)
    const last = prior[prior.length - 1]
    if (last) setCurrentStep({ ...last, editHref: '/get-started/questionnaire/q-prior-weight-management' })
  }, [])

  const saved = getStepValues(SESSION_INDEX)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      glp1Name:          typeof saved.glp1Name === 'string' ? saved.glp1Name : '',
      howTaken:          typeof saved.howTaken === 'string' ? saved.howTaken : '',
      dosage:            typeof saved.dosage === 'string' ? saved.dosage : '',
      timeSinceLastDose: TIME_OPTIONS.includes(saved.timeSinceLastDose as TimeSinceLastDose)
        ? saved.timeSinceLastDose as TimeSinceLastDose
        : undefined,
    },
  })

  const glp1NameValue = watch('glp1Name')
  const howTakenValue = watch('howTaken')
  const dosageValue = watch('dosage')

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  async function onSubmit(data: FormValues) {
    if (isNavigating) return
    setIsNavigating(true)
    const nameLabel = GLP1_OPTIONS.find(o => o.value === data.glp1Name)?.label ?? data.glp1Name
    const timeLabel = TIME_LABELS[data.timeSinceLastDose]
    const bubbles = [nameLabel, timeLabel]
    saveStep(
      SESSION_INDEX,
      { question: QUESTION_TEXT, bubbles },
      {
        glp1Name:          data.glp1Name,
        howTaken:          data.howTaken ?? '',
        dosage:            data.dosage ?? '',
        timeSinceLastDose: data.timeSinceLastDose,
      }
    )
    router.push(nextRoute)
  }

  return (
    <>
      <IntakeHeader backHref={backHref} progress={PROGRESS} />

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
              <p
                className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
                aria-live="polite"
                aria-label={QUESTION_TEXT}
              >
                {typingStarted && (
                  <>
                    {words.slice(0, visibleWords).map((word, i) => (
                      <span key={i}>{word}{i < visibleWords - 1 ? ' ' : ''}</span>
                    ))}
                    {visibleWords < words.length && (
                      <span
                        className="inline-block w-[2px] h-[1em] bg-current align-middle ml-[1px] animate-pulse"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* ── Form ── */}
          {done && (
            <form
              id="glp1-history-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease_forwards]"
            >

              {/* GLP-1 name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="glp1Name" className="text-sm font-medium text-[rgba(0,0,0,0.87)]">
                  GLP-1 name <span className="text-red-500">*</span>
                </label>
                <div className={`${selectWrapperCls} ${errors.glp1Name ? 'border-red-400' : ''}`}>
                  <select
                    id="glp1Name"
                    {...register('glp1Name')}
                    className={`flex-1 h-full bg-transparent text-sm focus:outline-none border-0 pl-3 pr-1 appearance-none ${glp1NameValue ? 'text-[rgba(0,0,0,0.87)]' : 'text-[#71717a]'}`}
                    aria-invalid={!!errors.glp1Name}
                  >
                    <option value="" disabled hidden></option>
                    {GLP1_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <span className="pr-2 pointer-events-none"><ChevronUpDownIcon /></span>
                </div>
                <FieldError message={errors.glp1Name?.message} />
              </div>

              {/* How you took it + Dosage (2-up) */}
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label htmlFor="howTaken" className="text-sm font-medium text-[rgba(0,0,0,0.87)]">
                    How you took it
                  </label>
                  <div className={selectWrapperCls}>
                    <select
                      id="howTaken"
                      {...register('howTaken')}
                      className={`flex-1 h-full bg-transparent text-sm focus:outline-none border-0 pl-3 pr-1 appearance-none ${howTakenValue ? 'text-[rgba(0,0,0,0.87)]' : 'text-[#71717a]'}`}
                    >
                      <option value=""></option>
                      {HOW_TAKEN_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className="pr-2 pointer-events-none"><ChevronUpDownIcon /></span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label htmlFor="dosage" className="text-sm font-medium text-[rgba(0,0,0,0.87)]">
                    Dosage
                  </label>
                  <div className={selectWrapperCls}>
                    <select
                      id="dosage"
                      {...register('dosage')}
                      className={`flex-1 h-full bg-transparent text-sm focus:outline-none border-0 pl-3 pr-1 appearance-none ${dosageValue ? 'text-[rgba(0,0,0,0.87)]' : 'text-[#71717a]'}`}
                    >
                      <option value=""></option>
                      {DOSAGE_OPTIONS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <span className="pr-2 pointer-events-none"><ChevronUpDownIcon /></span>
                  </div>
                </div>
              </div>

              {/* Time since last dose */}
              <div className="flex flex-col gap-4">
                <p className="text-sm font-medium text-[rgba(0,0,0,0.87)]">
                  Time since last dose <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-col gap-4">
                  {TIME_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        value={opt}
                        {...register('timeSinceLastDose')}
                        className="size-4 accent-[#0778ba] cursor-pointer"
                        aria-invalid={!!errors.timeSinceLastDose}
                      />
                      <span className="text-sm text-[rgba(0,0,0,0.87)]">{TIME_LABELS[opt]}</span>
                    </label>
                  ))}
                </div>
                <FieldError message={errors.timeSinceLastDose?.message} />
              </div>

            </form>
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
          type="submit"
          form="glp1-history-form"
          disabled={isNavigating}
          className="
            relative w-full md:w-[480px] h-[42px] flex items-center justify-center gap-3 px-4
            overflow-hidden rounded-tl-[36px] rounded-br-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
          "
          style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
        >
          Save and continue
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
