'use client'

import { useEffect, useRef, useState } from 'react'
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

const QUESTION_TEXT = 'What medications are you currently taking? *'
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

// ─── Medications ─────────────────────────────────────────────────────────────

const MEDICATIONS = [
  { id: 'insulin', label: 'Insulin' },
  { id: 'sulfonylurea', label: 'Sulfonylurea or another diabetes medicine that can cause low blood sugar' },
  { id: 'birthcontrol', label: 'Oral birth control' },
  { id: 'bloodthinner', label: 'Blood thinner such as warfarin' },
  { id: 'levothyroxine', label: 'Levothyroxine' },
  { id: 'steroid', label: 'Steroid such as prednisone' },
  { id: 'thyroid', label: 'Thyroid medication, anti-thyroid medication, or other pituitary/hormone treatment' },
  { id: 'cancer', label: 'Cancer treatment medicines' },
  { id: 'others', label: 'Others (please specify)' },
] as const

type MedicationId = typeof MEDICATIONS[number]['id']

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 30

// ─── Routes ──────────────────────────────────────────────────────────────────

const NEXT_STEP = '/get-started/questionnaire/step-7'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QuestionnaireStep6() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [selected, setSelected] = useState<Set<MedicationId>>(new Set())
  const [othersText, setOthersText] = useState('')
  const [isNavigating, setIsNavigating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const prior = getPriorSteps(5)
    const mapped: PriorStep[] = prior.map((s, i) => ({
      ...s,
      editHref: i === 0 ? '/get-started' : `/get-started/questionnaire${i === 1 ? '' : `/step-${i}`}`,
    }))
    setCurrentStep(mapped[mapped.length - 1] ?? null)

    const saved = getStepValues(5)
    if (typeof saved.medications === 'string' && saved.medications) {
      setSelected(new Set(saved.medications.split(',') as MedicationId[]))
    }
    if (typeof saved.medicationsOther === 'string') {
      setOthersText(saved.medicationsOther)
    }
  }, [])

  const currentBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done } =
    useAnimationSequence(currentBubbleCount)

  const hasSelection = selected.size > 0
  const othersChecked = selected.has('others')

  function toggle(id: MedicationId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (id === 'others') {
          setTimeout(() => textareaRef.current?.focus(), 50)
        }
      }
      return next
    })
  }

  function handleNone() {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      5,
      { question: QUESTION_TEXT, bubbles: ['I\'m not taking any currently'] },
      { medications: '', medicationsOther: '' }
    )
    router.push(NEXT_STEP)
  }

  function handleContinue() {
    if (isNavigating || !hasSelection) return
    setIsNavigating(true)

    const selectedMeds = MEDICATIONS.filter((m) => selected.has(m.id))
    const bubbles = selectedMeds.map((m) =>
      m.id === 'others' && othersText.trim() ? othersText.trim() : m.label
    )

    saveStep(
      5,
      { question: QUESTION_TEXT, bubbles },
      { medications: [...selected].join(','), medicationsOther: othersText.trim() }
    )
    router.push(NEXT_STEP)
  }

  return (
    <>
      <BackHeader backHref="/get-started/questionnaire/step-5" progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto bg-white focus:outline-none"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: done && hasSelection ? '7rem' : '2rem',
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
              {done && (
                <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                  WHY WE ASK: This allows providers to check whether the treatments they may prescribe are safe to take with your current medications.
                </p>
              )}
            </div>
          </div>

          {/* ── Medication list ── */}
          {done && (
            <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease_forwards]">
              <button
                type="button"
                onClick={handleNone}
                disabled={isNavigating}
                className="
                  w-full h-[42px] flex items-center justify-center px-4
                  rounded-lg border border-[#e4e4e7] bg-white
                  text-base font-medium text-[#3A5190]
                  shadow-sm transition-colors hover:border-[#3A5190]/40
                  disabled:opacity-60
                "
              >
                I&rsquo;m not taking any currently
              </button>

              <fieldset className="flex flex-col gap-6 border-0 p-0 m-0">
                <legend className="sr-only">Select any medications you are currently taking</legend>
                {MEDICATIONS.map((med) => (
                  <div key={med.id} className="flex flex-col gap-2">
                    <label className="flex gap-3 items-start cursor-pointer">
                      <div className="flex h-5 items-center justify-center shrink-0 w-4 mt-0.5">
                        <input
                          type="checkbox"
                          checked={selected.has(med.id)}
                          onChange={() => toggle(med.id)}
                          className="
                            size-4 rounded-[4px] border border-[#e4e4e7]
                            accent-[#3A5190]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1
                            cursor-pointer
                          "
                        />
                      </div>
                      <span className="text-sm leading-5 text-[#09090b]">
                        {med.label}
                      </span>
                    </label>

                    {med.id === 'others' && othersChecked && (
                      <div className="ml-7 animate-[fadeIn_0.3s_ease_forwards]">
                        <textarea
                          ref={textareaRef}
                          value={othersText}
                          onChange={(e) => setOthersText(e.target.value)}
                          rows={4}
                          aria-label="List other medications, supplements, or therapies"
                          placeholder="Other prescription and over-the-counter medicines, vitamins, supplements, hormones, injections, and IV therapies"
                          className="
                            w-full px-3 py-1.5 rounded-lg
                            border border-[#e4e4e7] bg-white
                            text-base leading-6 text-[rgba(0,0,0,0.87)]
                            placeholder:text-[#71717a]
                            shadow-sm resize-y transition-colors
                            focus:outline-none focus:border-[#3A5190]
                          "
                        />
                      </div>
                    )}
                  </div>
                ))}
              </fieldset>
            </div>
          )}

        </div>
      </main>

      {/* ── Sticky CTA — visible only when at least one medication selected ── */}
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
