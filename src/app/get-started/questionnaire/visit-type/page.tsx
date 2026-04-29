'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'
import { US_STATES } from '@/lib/us-states'
import { SYNC_REQUIRED_STATES_SET } from '@/lib/intake-flow'

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

// SYNC_REQUIRED_STATES_SET is imported from @/lib/intake-flow as the single
// source of truth. Mississippi was missing from the array previously — that
// fix lives there too.

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 100

// ─── Routes ──────────────────────────────────────────────────────────────────

const ASYNC_ROUTE = '/get-started/questionnaire/choose-treatments'
const CONSULT_ROUTE = '/get-started/questionnaire/book-consultation'

// ─── Card ────────────────────────────────────────────────────────────────────

interface VisitTypeCardProps {
  label: string
  title: string
  price: string
  badges: string[]
  cta: string
  cardGradient: string
  onClick: () => void
  disabled: boolean
  unavailable?: boolean
}

function VisitTypeCard({
  label,
  title,
  price,
  badges,
  cta,
  cardGradient,
  onClick,
  disabled,
  unavailable = false,
}: VisitTypeCardProps) {
  return (
    <div className="flex flex-col w-full">
      {/* Card content — only top-left corner rounded */}
      <div
        className="flex items-center pl-6 pr-4 py-5 rounded-tl-[36px]"
        style={{ background: cardGradient }}
      >
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* 2-up: heading column + price */}
          <div className="flex gap-2 items-start text-white w-full">
            <div className="flex flex-col gap-1 flex-1 min-w-0 justify-center h-12">
              <p className="text-xs font-light leading-4 tracking-[1.5px] uppercase">
                {label}
              </p>
              <p className="text-[20px] font-normal leading-7 tracking-[-0.5px]">
                {title}
              </p>
            </div>
            <p className="shrink-0 font-light whitespace-nowrap">
              <span className="text-[20.64px] leading-[1.5]">$</span>
              <span className="text-[32px] leading-[1.5]">{price}</span>
              <span className="text-base leading-[1.5]"> fee</span>
            </p>
          </div>

          {/* Badges */}
          <div className="flex gap-2 items-start flex-wrap">
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center justify-center px-1.5 py-1 rounded-xl text-xs leading-4 text-white/70 bg-white/[0.08] border border-white/[0.12]"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Button — full-width, only bottom-right corner rounded */}
      {unavailable ? (
        <div
          aria-disabled="true"
          className="
            w-full h-[42px] flex items-center justify-center px-4
            rounded-br-[36px] overflow-hidden cursor-not-allowed
            text-white text-xs font-medium leading-4 tracking-[1.5px] uppercase whitespace-nowrap
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
          "
          style={{ background: '#737373' }}
        >
          {cta}
        </div>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="
            relative w-full h-[42px] flex items-center justify-center gap-3 px-4
            rounded-br-[36px] overflow-hidden
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
          "
          style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
        >
          {cta}
          <ChevronRightIcon />
        </button>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VisitTypePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  const [requiresSync] = useState(() => {
    const s0 = getStepValues(0)
    return typeof s0.state === 'string' && SYNC_REQUIRED_STATES_SET.has(s0.state)
  })

  const [userStateName] = useState(() => {
    const s0 = getStepValues(0)
    if (typeof s0.state !== 'string') return ''
    return US_STATES.find(s => s.value === s0.state)?.label ?? ''
  })

  useEffect(() => {
    const saved = getStepValues(0)
    setFirstName(typeof saved.firstName === 'string' ? saved.firstName : '')

    const prior = getPriorSteps(11)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({
        ...last,
        editHref: '/get-started/questionnaire/step-11',
      })
    }
  }, [])

  const questionText =
    firstName === null
      ? null
      : firstName
        ? `Thanks for your responses, ${firstName}. Next, choose how you\u2019d like to move forward.`
        : `Thanks for your responses. Next, choose how you\u2019d like to move forward.`
  const nameToken = firstName ? `${firstName}.` : null

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(questionText, priorBubbleCount)

  function handleAsync() {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      11,
      { question: "Next, choose how you'd like to move forward.", bubbles: ['Choose medications'] },
      { visitType: 'async' }
    )
    router.push(ASYNC_ROUTE)
  }

  function handleConsult() {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      11,
      { question: "Next, choose how you'd like to move forward.", bubbles: ['Book a live consultation'] },
      { visitType: 'consult' }
    )
    router.push(CONSULT_ROUTE)
  }

  return (
    <>
      <BackHeader backHref="/get-started/questionnaire/step-11" progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto bg-white focus:outline-none"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: '2rem',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

          {/* ── Previous step's Q&A ── */}
          <ChatHistory
            historicSteps={[]}
            currentStep={currentStep}
            animateCurrentStep={animateBubbles}
          />

          {/* ── Eve's message ── */}
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
                aria-label={questionText ?? undefined}
              >
                {typingStarted && (
                  <>
                    {words.slice(0, visibleWords).map((word, i) => {
                      const isName = nameToken !== null && word === nameToken
                      return (
                        <span key={i} style={isName ? { color: '#1976d2' } : undefined}>
                          {word}
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
              {done && (
                <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                  For either path, a licensed provider will review your information before anything is prescribed.
                </p>
              )}
            </div>
          </div>

          {/* ── Visit type cards ── */}
          {done && (
          <div className="flex flex-col gap-6 items-center animate-[fadeIn_0.4s_ease_forwards]">

            {requiresSync ? (
              /* Restricted-state layout: consult first, async disabled second */
              <>
                <VisitTypeCard
                  label="Need guidance?"
                  title="Consult a provider"
                  price="35"
                  badges={['20 minutes (video/phone)', 'Personalized plan']}
                  cta="Book a live consultation"
                  cardGradient="linear-gradient(268.18deg, #1d2d44 0%, #233d5a 100%)"
                  onClick={handleConsult}
                  disabled={isNavigating}
                />

                <div className="flex items-center gap-3 w-[180px]">
                  <div className="flex-1 h-px bg-[#d4d4d8]" />
                  <span className="text-sm font-medium leading-5 text-[#71717a]">OR</span>
                  <div className="flex-1 h-px bg-[#d4d4d8]" />
                </div>

                <div className="flex flex-col gap-3 w-full">
                  <VisitTypeCard
                    label="Know what you want?"
                    title="Request your treatment"
                    price="0"
                    badges={['Decisions in 12 hours', 'No scheduling']}
                    cta="Unavailable*"
                    cardGradient="linear-gradient(129.44deg, #1d2d44 0%, #233d5a 100%)"
                    onClick={() => {}}
                    disabled
                    unavailable
                  />
                  <p className="text-[12px] leading-[1.66] tracking-[0.4px] text-[rgba(0,0,0,0.6)]">
                    *Since you live in {userStateName}, you are required to complete a video
                    consultation with a provider initially.{' '}
                    <strong className="font-bold">
                      For future requests or refills, it will no longer be required.
                    </strong>
                  </p>
                </div>
              </>
            ) : (
              /* Standard layout: async first, consult second */
              <>
                <VisitTypeCard
                  label="Know what you want?"
                  title="Request your treatment"
                  price="0"
                  badges={['Decisions in 12 hours', 'No scheduling']}
                  cta="Choose medications"
                  cardGradient="linear-gradient(129.44deg, #1d2d44 0%, #233d5a 100%)"
                  onClick={handleAsync}
                  disabled={isNavigating}
                />

                <div className="flex items-center gap-3 w-[180px]">
                  <div className="flex-1 h-px bg-[#d4d4d8]" />
                  <span className="text-sm font-medium leading-5 text-[#71717a]">OR</span>
                  <div className="flex-1 h-px bg-[#d4d4d8]" />
                </div>

                <VisitTypeCard
                  label="Need guidance?"
                  title="Consult a provider"
                  price="35"
                  badges={['20 minutes (video/phone)', 'Personalized plan']}
                  cta="Book a live consultation"
                  cardGradient="linear-gradient(268.18deg, #1d2d44 0%, #233d5a 100%)"
                  onClick={handleConsult}
                  disabled={isNavigating}
                />
              </>
            )}

          </div>
          )}

        </div>
      </main>
    </>
  )
}
