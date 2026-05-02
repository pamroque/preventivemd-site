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
  'Unfortunately, based on the information you\u2019ve shared, we\u2019re unable to continue with your case at this time.'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DisqualificationPage() {
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)

  useEffect(() => {
    // The briefback always references the LAST questionnaire step the
    // user answered, which is step-11 (stress level, saved at index 10).
    // The disqualification decision happens at step-11 regardless of
    // which earlier answer triggered it (`isIntakeDisqualified()` in
    // src/lib/disqualification.ts), so anchoring to the last step keeps
    // the chat-history bubble consistent for every disqualification
    // path. Edits send the user back to step-11 to revise.
    const prior = getPriorSteps(11)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({
        ...last,
        editHref: '/get-started/questionnaire/step-11',
      })
    }
  }, [])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-white pt-12 md:pt-14 pb-24 focus:outline-none"
    >
      <div className="mx-auto w-full px-4 md:max-w-[560px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

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

        {/* CTA + contact block hold off rendering until Eve has finished
            typing — keeps the visual hierarchy of "Eve speaks, then the
            user sees their next move" consistent with the rest of the
            intake. The shared `fadeIn` keyframe handles the entrance. */}
        {done && (
          <>
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
              style={{ background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-blue) 64.61%, var(--brand-mint) 100%)' }}
            >
              About our treatments
              <ChevronRightIcon />
            </Link>

            {/* ── Contact details — matches the Sign in page's support
                 block, with the heading edited per Figma 610:15549. */}
            <div className="flex flex-col items-center gap-0.5 animate-[fadeIn_0.4s_ease_forwards]">
              <p className="text-sm text-center text-[rgba(0,0,0,0.6)] leading-[1.43] tracking-[0.17px]">
                For further questions, please contact
              </p>
              <p className="text-sm text-center text-[rgba(0,0,0,0.6)] leading-[1.43] tracking-[0.17px]">
                <a
                  href="tel:+19876543210"
                  className="font-medium text-brand-blue underline decoration-solid underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] rounded-sm"
                >
                  +1 (987) 654-3210
                </a>
                {' or '}
                <a
                  href="mailto:hello@preventivemd.com"
                  className="font-medium text-brand-blue underline decoration-solid underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] rounded-sm"
                >
                  hello@preventivemd.com
                </a>
              </p>
            </div>
          </>
        )}

      </div>
    </main>
  )
}
