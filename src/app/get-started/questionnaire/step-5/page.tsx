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

const QUESTION_TEXT = 'Do you have any of these conditions? *'
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

// ─── Conditions ───────────────────────────────────────────────────────────────

interface Condition {
  id: string
  label: string
  /** Shorter label used in the chat-history bubble (defaults to `label`).
   *  Lets us drop a "(please specify)" hint that belongs in the form
   *  but reads awkwardly in the briefback. */
  bubbleLabel?: string
  /** When true, the condition reveals a required free-text input under
   *  its checkbox so the patient can elaborate. */
  requiresDetail?: boolean
  disqualifying: boolean
}

const CONDITIONS: Condition[] = [
  {
    id: 'pregnancy',
    label: 'Pregnancy, breastfeeding, or plans to be pregnant in the next 2 months',
    disqualifying: true,
  },
  { id: 'pancreatitis',  label: 'Pancreatitis',                                                       disqualifying: false },
  { id: 'gallstones',    label: 'Gallstones or gallbladder disease',                                  disqualifying: false },
  { id: 'gastroparesis', label: 'Gastroparesis or severe stomach-emptying problems',                  disqualifying: false },
  { id: 'type1diabetes', label: 'Type 1 diabetes',                                                    disqualifying: false },
  { id: 'type2diabetes', label: 'Type 2 diabetes',                                                    disqualifying: false },
  { id: 'retinopathy',   label: 'Diabetic retinopathy or eye disease',                                disqualifying: false },
  { id: 'ketoacidosis',  label: 'Diabetic ketoacidosis',                                              disqualifying: false },
  { id: 'cardiovascular', label: 'Serious heart problems, blood vessel disease, or uncontrolled high blood pressure', disqualifying: false },
  { id: 'kidney',        label: 'Kidney disease',                                                     disqualifying: false },
  { id: 'liver',         label: 'Liver disease',                                                      disqualifying: false },
  { id: 'pituitary',     label: 'Hormone-related conditions, including pituitary, thyroid, adrenal, pancreatic, Cushing’s, Addison’s, or PCOS', disqualifying: false },
  {
    id: 'cancer-self',
    label: 'Cancer now or in the past',
    requiresDetail: true,
    disqualifying: false,
  },
  {
    id: 'cancer-family',
    label: 'Family history of cancer',
    requiresDetail: true,
    disqualifying: false,
  },
  { id: 'mtc',           label: 'Medullary thyroid cancer (MTC) or Multiple Endocrine Neoplasia syndrome type 2 (MEN2) (or family history)', disqualifying: false },
  { id: 'wilsons',       label: 'Wilson’s disease or other copper metabolism disorders',              disqualifying: false },
  { id: 'lhon',          label: 'Leber hereditary optic neuropathy (LHON)',                           disqualifying: false },
  { id: 'sulfur',        label: 'Sulfur (NOT sulfa) allergy',                                         disqualifying: false },
]

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 25

// ─── Routes ──────────────────────────────────────────────────────────────────

const NEXT_STEP = '/get-started/questionnaire/step-6'

// Disqualifying answers no longer reroute here — the user finishes the
// questionnaire and the decision is made at step-11 via
// `src/lib/disqualification.ts > isIntakeDisqualified()`. The
// `disqualifying: true` flags on the CONDITIONS list are kept for
// documentation; the routing source of truth lives in the lib helper.

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Camel-case session-storage key for a condition's "please specify"
 *  detail, e.g. `cancer-self` → `cancerSelfDetail`. */
function detailKey(conditionId: string): string {
  const camel = conditionId.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  return `${camel}Detail`
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuestionnaireStep5() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  /** Free-text "please specify" detail per condition id. Only populated
   *  for conditions whose `requiresDetail` flag is true. Optional. */
  const [details, setDetails] = useState<Record<string, string>>({})
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    const prior = getPriorSteps(4)
    const mapped: PriorStep[] = prior.map((s, i) => ({
      ...s,
      editHref: i === 0 ? '/get-started' : `/get-started/questionnaire${i === 1 ? '' : `/step-${i}`}`,
    }))
    setCurrentStep(mapped[mapped.length - 1] ?? null)

    const saved = getStepValues(4)
    if (typeof saved.conditions === 'string' && saved.conditions) {
      setSelected(new Set(saved.conditions.split(',')))
    }
    // Restore detail strings for any condition that defines one.
    const restored: Record<string, string> = {}
    for (const c of CONDITIONS) {
      if (!c.requiresDetail) continue
      const key = detailKey(c.id)
      if (typeof saved[key] === 'string') restored[c.id] = saved[key] as string
    }
    if (Object.keys(restored).length > 0) setDetails(restored)
  }, [])

  const currentBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done } =
    useAnimationSequence(currentBubbleCount)

  const visibleConditions = CONDITIONS
  const hasSelection = selected.size > 0

  function toggle(id: string) {
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

  function setDetail(id: string, value: string) {
    setDetails((prev) => ({ ...prev, [id]: value }))
  }

  function handleNone() {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      4,
      { question: QUESTION_TEXT, bubbles: ['No, I don’t have any of these'] },
      { conditions: '' }
    )
    router.push(NEXT_STEP)
  }

  function handleContinue() {
    if (isNavigating || !hasSelection) return
    setIsNavigating(true)

    const selectedConditions = CONDITIONS.filter((c) => selected.has(c.id))
    const bubbles = selectedConditions.map((c) => {
      const head = c.bubbleLabel ?? c.label
      const detail = c.requiresDetail ? (details[c.id] ?? '').trim() : ''
      return detail ? `${head}: ${detail}` : head
    })

    const detailValues: Record<string, string> = {}
    for (const c of CONDITIONS) {
      if (!c.requiresDetail) continue
      const v = (details[c.id] ?? '').trim()
      if (selected.has(c.id) && v) detailValues[detailKey(c.id)] = v
    }

    saveStep(
      4,
      { question: QUESTION_TEXT, bubbles },
      { conditions: [...selected].join(','), ...detailValues },
    )
    router.push(NEXT_STEP)
  }

  return (
    <>
      <BackHeader backHref="/get-started/questionnaire/step-4" progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className={`overflow-y-auto bg-white focus:outline-none ${done && hasSelection ? 'pb-[74px] md:pb-[138px]' : 'pb-8'}`}
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
        }}
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
                  WHY WE ASK: This helps providers assess safety and avoid harmful interactions.
                </p>
              )}
            </div>
          </div>

          {/* ── Condition list ── */}
          {done && (
            <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease_forwards]">
              <button
                type="button"
                onClick={handleNone}
                disabled={isNavigating}
                className="
                  w-full h-[42px] flex items-center justify-center px-4
                  rounded-lg border border-[#e4e4e7] bg-white
                  text-base font-medium text-brand-blue
                  shadow-sm transition-colors hover:border-brand-blue/40
                  disabled:opacity-60
                "
              >
                No, I don&rsquo;t have any of these
              </button>

              <fieldset className="flex flex-col gap-6 border-0 p-0 m-0">
                <legend className="sr-only">Select any conditions that apply</legend>
                {visibleConditions.map((condition) => {
                  const isChecked = selected.has(condition.id)
                  const showDetail = condition.requiresDetail && isChecked
                  const detailId = `${condition.id}-detail`
                  return (
                    <div
                      key={condition.id}
                      className={`flex flex-col gap-3 ${showDetail ? 'mb-3' : ''}`}
                    >
                      <label className="flex gap-3 items-start cursor-pointer">
                        <div className="flex h-5 items-center justify-center shrink-0 w-4 mt-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(condition.id)}
                            className="
                              size-4 rounded-[4px] border border-[#e4e4e7]
                              accent-brand-blue
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1
                              cursor-pointer
                            "
                          />
                        </div>
                        <span className="text-sm leading-5 text-[#09090b]">
                          {condition.label}
                        </span>
                      </label>

                      {showDetail && (
                        <div className="flex flex-col gap-1.5 pl-7">
                          <label htmlFor={detailId} className="sr-only">
                            {`Please specify: ${condition.bubbleLabel ?? condition.label}`}
                          </label>
                          <input
                            id={detailId}
                            type="text"
                            value={details[condition.id] ?? ''}
                            onChange={(e) => setDetail(condition.id, e.target.value)}
                            placeholder="Please specify (optional)"
                            className="
                              w-full h-[42px] px-3 py-1.5 bg-white border border-[#e4e4e7] rounded-lg shadow-sm
                              text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a]
                              focus:outline-none focus:border-brand-blue transition-colors
                            "
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </fieldset>
            </div>
          )}

        </div>
      </main>

      {/* ── Sticky CTA — visible only when at least one condition selected ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-12 pt-4 transition-all duration-500"
        style={{
          opacity: done && hasSelection ? 1 : 0,
          pointerEvents: done && hasSelection ? 'auto' : 'none',
          background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))',
        }}
      >
        <button
          type="button"
          onClick={handleContinue}
          disabled={isNavigating || !hasSelection}
          className="
            relative flex items-center justify-center gap-3
            w-full md:w-[560px] h-[42px] px-4 overflow-hidden
            rounded-br-[36px] rounded-tl-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
          "
          style={{
            background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-blue) 64.61%, var(--brand-mint) 100%)',
          }}
        >
          {isNavigating ? 'Saving…' : 'Save and continue'}
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
