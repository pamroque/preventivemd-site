'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'
import {
  getSelectedGoals,
  getNextGoalRoute,
  getPrevGoalRoute,
} from '@/lib/goal-routing'
import {
  getApproachSubquestionSequence,
} from '@/lib/approach-routing'

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

function GlobeAltIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className="size-9 shrink-0 text-[#bdbdbd]" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.038 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.038-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  )
}

// ─── Data ────────────────────────────────────────────────────────────────────

interface Approach {
  id: string
  label: string
  sub: string | null
}

const APPROACHES: Approach[] = [
  { id: 'exercise',              label: 'Exercise',                    sub: null },
  { id: 'healthy-diet',         label: 'Healthy diet',                sub: 'Examples: Ketogenic (keto) diet, intermittent fasting, plant-based' },
  { id: 'weight-loss-programs', label: 'Weight loss programs',        sub: 'Examples: Noom, Weight Watchers\u00ae, Jenny Craig' },
  { id: 'glp1-medication',      label: 'GLP-1 medication',            sub: 'Examples: Wegovy\u00ae (semaglutide), Zepbound\u00ae (tirzepatide)' },
  { id: 'other-medication',     label: 'Other weight loss medication', sub: null },
  { id: 'weight-loss-surgery',  label: 'Weight loss surgery',         sub: 'Examples: gastric bypass, gastric sleeve, lap band, duodenal switch' },
]

// ─── Copy / config ────────────────────────────────────────────────────────────

const THIS_ROUTE = '/get-started/questionnaire/q-prior-weight-management'
const FULL_TEXT = 'A GLP-1 medication may help you reach your goal in about 24 weeks. What approaches have you previously tried to lose weight? *'
const QUESTION_TEXT = 'What approaches have you previously tried to lose weight?'
// Word indices in FULL_TEXT.split(' ')
// 0-12:  GLP-1 sentence; 7-12 ("your goal in about 24 weeks.") are blue
// 13:    start of question ("What")
// last:  "*" is red
const BLUE_RANGE  = [7, 12]  // inclusive
const BREAK_BEFORE = 13      // insert <br /> before "What"
const SESSION_INDEX = 51
const PROGRESS = 19

// ─── Page ────────────────────────────────────────────────────────────────────

export default function QPriorWeightManagementPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  const [backHref, setBackHref] = useState('/get-started/questionnaire/q-target-weight')
  const [nextRoute, setNextRoute] = useState('/get-started/questionnaire/step-4')

  useEffect(() => {
    const goals = getSelectedGoals()
    setBackHref(getPrevGoalRoute(THIS_ROUTE, goals))
    setNextRoute(getNextGoalRoute(THIS_ROUTE, goals))
  }, [])

  // Restore checkbox selections on back navigation
  const [selected, setSelected] = useState<Set<string>>(() => {
    const saved = getStepValues(SESSION_INDEX)
    if (typeof saved.approaches === 'string') {
      try { return new Set(JSON.parse(saved.approaches) as string[]) } catch { /* ignore */ }
    }
    return new Set()
  })

  useEffect(() => {
    // Show q-target-weight's answer (index 50) as the prior context bubble
    const prior = getPriorSteps(51)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({ ...last, editHref: '/get-started/questionnaire/q-target-weight' })
    }
  }, [])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(FULL_TEXT, priorBubbleCount, { pauseBeforeWord: BREAK_BEFORE })

  const hasSelection = selected.size > 0

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleNone() {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      SESSION_INDEX,
      { question: QUESTION_TEXT, bubbles: ["I haven\u2019t tried any of these"] },
      { approaches: JSON.stringify([]), noneSelected: true }
    )
    router.push(nextRoute)
  }

  function handleContinue() {
    if (isNavigating) return
    setIsNavigating(true)
    const selectedArr = [...selected]
    const bubbles = APPROACHES.filter(a => selected.has(a.id)).map(a => a.label)
    saveStep(
      SESSION_INDEX,
      { question: QUESTION_TEXT, bubbles },
      { approaches: JSON.stringify(selectedArr), noneSelected: false }
    )
    const seq = getApproachSubquestionSequence(selectedArr)
    router.push(seq.length > 0 ? seq[0].route : nextRoute)
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

          {/* ── Eve's message ── */}
          <div className="flex items-start gap-3 w-full">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
                aria-live="polite"
                aria-label={QUESTION_TEXT}
              >
                {typingStarted && (
                  <>
                    {words.slice(0, visibleWords).map((word, i) => {
                      const isBlue = i >= BLUE_RANGE[0] && i <= BLUE_RANGE[1]
                      const isRed  = word === '*'
                      return (
                        <span key={i}>
                          {i === BREAK_BEFORE && <><br /><br /></>}
                          <span style={isBlue ? { color: '#1976d2' } : undefined}
                                className={isRed ? 'text-red-600' : undefined}>
                            {word}
                          </span>
                          {i < visibleWords - 1 ? ' ' : ''}
                        </span>
                      )
                    })}
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
            <div className="flex flex-col gap-4 animate-[fadeIn_0.4s_ease_forwards]">

              {/* "None" — one-click, saves and navigates immediately */}
              <button
                type="button"
                onClick={handleNone}
                disabled={isNavigating}
                className="
                  w-full h-[42px] flex items-center justify-center px-4
                  rounded-lg border border-[#e4e4e7] bg-white
                  text-base font-medium text-[#0778ba]
                  hover:bg-gray-50 transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]
                  disabled:opacity-60
                "
              >
                I haven&rsquo;t tried any of these
              </button>

              {/* Checkbox cards */}
              {APPROACHES.map(approach => {
                const isSelected = selected.has(approach.id)
                return (
                  <div
                    key={approach.id}
                    style={isSelected ? {
                      padding: 2,
                      background: 'linear-gradient(90deg, #0778ba 0%, #00b4c8 100%)',
                      borderRadius: 10,
                    } : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(approach.id)}
                      aria-pressed={isSelected}
                      className={`w-full flex items-center gap-6 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba] focus-visible:ring-offset-1 ${
                        isSelected
                          ? 'rounded-[8px] bg-white'
                          : 'rounded-lg border border-[#e3e3e3] bg-white hover:border-[#0778ba]/40'
                      }`}
                    >
                      {/* Checkbox indicator */}
                      <div className={`shrink-0 size-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[#0778ba] border-[#0778ba]'
                          : 'bg-white border-[#e4e4e7]'
                      }`}>
                        {isSelected && (
                          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3 text-white" aria-hidden="true">
                            <path fillRule="evenodd"
                              d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
                              clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Label + subtitle */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <span className={`text-base font-medium leading-6 ${isSelected ? 'text-[#0778ba]' : 'text-[rgba(0,0,0,0.87)]'}`}>
                          {approach.label}
                        </span>
                        {approach.sub && (
                          <span className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                            {approach.sub}
                          </span>
                        )}
                      </div>

                      <GlobeAltIcon />
                    </button>
                  </div>
                )
              })}

            </div>
          )}

        </div>
      </main>

      {/* ── Sticky CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-8 pt-4"
        style={{
          background: 'linear-gradient(to top, white 70%, rgba(255,255,255,0))',
          opacity: done && hasSelection ? 1 : 0,
          pointerEvents: done && hasSelection ? 'auto' : 'none',
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
