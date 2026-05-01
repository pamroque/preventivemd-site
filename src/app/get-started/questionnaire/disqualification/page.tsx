'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'

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

// ─── Copy ────────────────────────────────────────────────────────────────────

const QUESTION_TEXT =
  'Unfortunately, based on the information you shared, we\u2019re unable to continue with your case at this time.'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DisqualificationPage() {
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)

  useEffect(() => {
    const prior = getPriorSteps(5)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({
        ...last,
        editHref: '/get-started/questionnaire/step-5',
      })
    }
  }, [])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-white pt-12 md:pt-14 pb-24 focus:outline-none"
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
                  {words.slice(0, visibleWords).map((word, i) => (
                    <span key={i}>
                      {word}
                      {i < visibleWords - 1 ? ' ' : ''}
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
        </div>

        {/* ── About our treatments CTA ── */}
        <Link
          href="/#treatments"
          className="
            relative flex items-center justify-center gap-3
            w-full h-[42px] px-4 overflow-hidden
            rounded-tl-[36px] rounded-br-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
            animate-[fadeIn_0.4s_ease_forwards]
          "
          style={{ background: 'linear-gradient(90deg, #3A5190 0%, #3A5190 64.61%, #A2D5BC 100%)' }}
        >
          About our treatments
          <ChevronRightIcon />
        </Link>

      </div>
    </main>
  )
}
