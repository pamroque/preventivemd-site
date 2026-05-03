'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import DisqualificationGate from '@/components/ui/DisqualificationGate'
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

const PROGRESS = 70

// ─── Routes ──────────────────────────────────────────────────────────────────

const ASYNC_ROUTE = '/get-started/questionnaire/choose-treatments'
const CONSULT_ROUTE = '/get-started/questionnaire/desired-treatments'

// ─── Card ────────────────────────────────────────────────────────────────────

interface VisitTypeCardProps {
  label: string
  title: string
  /** When omitted, the price column is hidden and the heading takes the full row. */
  price?: string
  /** Caption shown beneath the price (e.g. "per visit"). Defaults to "per visit". */
  priceCaption?: string
  badges: string[]
  cta: string
  cardGradient: string
  onClick: () => void
  disabled: boolean
  unavailable?: boolean
  /** When true, applies the drifting orb highlight animation
   *  (`.path-card-orb`) over the card composite to highlight it. */
  shine?: boolean
}

function VisitTypeCard({
  label,
  title,
  price,
  priceCaption = 'per visit',
  badges,
  cta,
  cardGradient,
  onClick,
  disabled,
  unavailable = false,
  shine = false,
}: VisitTypeCardProps) {
  const showPrice = Boolean(price)
  return (
    <div
      className={`relative flex flex-col w-full ${
        shine ? 'path-card-orb overflow-hidden rounded-tl-[36px] rounded-br-[36px]' : ''
      }`}
    >
      {/* Card content — only top-left corner rounded */}
      <div
        className="flex items-center pl-6 pr-4 py-5 rounded-tl-[36px]"
        style={{ background: cardGradient }}
      >
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          {/* 2-up: heading column + (optional) price */}
          <div className="flex gap-2 items-start text-white w-full">
            <div className="flex flex-col gap-2 flex-1 min-w-0 justify-center min-h-12">
              <p className="text-xs font-light leading-4 tracking-[1.5px] uppercase">
                {label}
              </p>
              <p
                className={`font-serif italic leading-[1.3] ${
                  showPrice ? 'text-[2rem]' : 'text-[1.75rem]'
                }`}
              >
                {title}
              </p>
            </div>
            {showPrice && (
              <p className="shrink-0 font-light whitespace-nowrap text-right">
                <span className="text-[20.64px] leading-none">$</span>
                <span className="text-[2rem] leading-none">{price}</span>
                <br aria-hidden="true" />
                <span className="text-sm leading-tight">{priceCaption}</span>
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="flex gap-2 items-start flex-wrap">
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs leading-4 text-white/70 bg-white/[0.08] border border-white/[0.12]"
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
          // Focus ring uses `ring-inset` so it stays inside the button and
          // isn't clipped by the parent card's `overflow-hidden` (added on
          // shined cards to clip the path-card-orb to the rounded silhouette).
          // Without `ring-inset`, the offset ring on the "Book a live
          // consultation" button is invisible while the unshined "Choose
          // medications" button shows it normally.
          className="
            relative w-full h-[42px] flex items-center justify-center gap-3 px-4
            rounded-br-[36px] overflow-hidden
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3b82f6]
          "
          style={{ background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-blue) 64.61%, var(--brand-mint) 100%)' }}
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

    const prior = getPriorSteps(13)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({
        ...last,
        editHref: '/get-started/questionnaire/step-13',
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
      13,
      { question: "Next, choose how you'd like to move forward.", bubbles: ['Choose medications'] },
      { visitType: 'async' }
    )
    router.push(ASYNC_ROUTE)
  }

  function handleConsult() {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      13,
      { question: "Next, choose how you'd like to move forward.", bubbles: ['Book a live consultation'] },
      { visitType: 'consult' }
    )
    router.push(CONSULT_ROUTE)
  }

  return (
    <>
      <DisqualificationGate />
      <BackHeader backHref="/get-started/questionnaire/step-13" progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto bg-white focus:outline-none pb-12"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[560px] md:px-0 flex flex-col gap-6 md:gap-9 pt-6 md:pt-9">

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
                        <span key={i} className={isName ? 'text-brand-blue' : undefined}>
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
                  Medication costs are separate and not yet included in the following fees.
                </p>
              )}
            </div>
          </div>

          {/* ── Visit type cards ── */}
          {done && (
          <div className="flex flex-col gap-6 items-center animate-[fadeIn_0.4s_ease_forwards]">

            {requiresSync ? (
              /* Restricted-state layout: concierge first, async disabled second */
              <>
                <VisitTypeCard
                  label="For a more personal touch"
                  title="Meet with your concierge provider"
                  price="99"
                  priceCaption="per visit"
                  badges={['30-minute video call', 'Personalized plan']}
                  cta="Book a live consultation"
                  cardGradient="linear-gradient(268.84deg, var(--brand-navy) 0%, #0f172a 100%)"
                  onClick={handleConsult}
                  disabled={isNavigating}
                  shine
                />

                <div className="flex items-center gap-3 w-[180px]">
                  <div className="flex-1 h-px bg-[#d4d4d8]" />
                  <span className="text-base leading-6 text-[#71717a]">OR</span>
                  <div className="flex-1 h-px bg-[#d4d4d8]" />
                </div>

                <div className="flex flex-col gap-3 w-full">
                  <VisitTypeCard
                    label="Already know what you want?"
                    title="Request your treatment"
                    badges={['Decisions in 24 hrs', 'No fee', 'Consult via chat']}
                    cta="Unavailable*"
                    cardGradient="linear-gradient(127.64deg, var(--brand-navy) 0%, #0f172a 100%)"
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
              /* Standard layout: concierge first (highlighted), async second */
              <>
                <VisitTypeCard
                  label="For a more personal touch"
                  title="Meet with your concierge provider"
                  price="99"
                  priceCaption="per visit"
                  badges={['30-minute video call', 'Personalized plan']}
                  cta="Book a live consultation"
                  cardGradient="linear-gradient(268.84deg, var(--brand-navy) 0%, #0f172a 100%)"
                  onClick={handleConsult}
                  disabled={isNavigating}
                  shine
                />

                <div className="flex items-center gap-3 w-[180px]">
                  <div className="flex-1 h-px bg-[#d4d4d8]" />
                  <span className="text-base leading-6 text-[#71717a]">OR</span>
                  <div className="flex-1 h-px bg-[#d4d4d8]" />
                </div>

                <VisitTypeCard
                  label="Already know what you want?"
                  title="Request your treatment"
                  badges={['Decisions in 24 hrs', 'No fee', 'Consult via chat']}
                  cta="Choose medications"
                  cardGradient="linear-gradient(127.64deg, var(--brand-navy) 0%, #0f172a 100%)"
                  onClick={handleAsync}
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
