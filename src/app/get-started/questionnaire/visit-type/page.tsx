'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import { getStepValues, saveStep } from '@/lib/intake-session-store'

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

function CheckBadgeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"
      className="size-4 shrink-0" aria-hidden="true">
      <path fillRule="evenodd"
        d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm3.844 4.574a.75.75 0 0 0-1.188-.918L7.172 8.35 5.28 6.483a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.12-.08l4.004-5.39Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 100

// ─── Routes ──────────────────────────────────────────────────────────────────

const ASYNC_ROUTE = '/get-started/questionnaire/review'
const CONSULT_ROUTE = '/get-started/questionnaire/book-consultation'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VisitTypePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    const saved = getStepValues(0)
    if (typeof saved.firstName === 'string' && saved.firstName) {
      setFirstName(saved.firstName)
    }
  }, [])

  function handleAsync() {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      11,
      { question: "Next, choose how you'd like to move forward.", bubbles: ['Request treatment'] },
      { visitType: 'async' }
    )
    router.push(ASYNC_ROUTE)
  }

  function handleConsult() {
    if (isNavigating) return
    setIsNavigating(true)
    saveStep(
      11,
      { question: "Next, choose how you'd like to move forward.", bubbles: ['Book consultation'] },
      { visitType: 'consult' }
    )
    router.push(CONSULT_ROUTE)
  }

  return (
    <>
      <IntakeHeader backHref="/get-started/questionnaire/step-11" progress={PROGRESS} />

      <main
        className="overflow-y-auto bg-white"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: '2rem',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

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
              <p className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)]">
                Thanks for your responses
                {firstName && (
                  <>, <span style={{ color: '#1976d2' }}>{firstName}</span></>
                )}. Next, choose how you’d like to move forward.
              </p>
              <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                For either path, a licensed provider will review your information before anything is prescribed.
              </p>
            </div>
          </div>

          {/* ── Visit type cards ── */}
          <div className="flex flex-col gap-0 animate-[fadeIn_0.4s_ease_forwards]">

            {/* Card 1: Request your treatment */}
            <div
              className="rounded-tl-[24px] rounded-tr-[24px] overflow-hidden"
              style={{ background: 'linear-gradient(129deg, #1d2d44 0%, #233d5a 100%)' }}
            >
              <div className="flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">
                    Know what you want?
                  </p>
                  <h2 className="text-xl font-semibold text-white leading-tight">
                    Request your treatment
                  </h2>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">$0</span>
                  <span className="text-sm text-white/60">consultation fee</span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-white/80">
                    <CheckBadgeIcon />
                    <span className="text-sm">Decisions in 12 hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <CheckBadgeIcon />
                    <span className="text-sm">No scheduling</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAsync}
                  disabled={isNavigating}
                  className="
                    w-full h-[42px] flex items-center justify-center gap-2 px-4
                    rounded-br-[36px] rounded-tl-[36px]
                    text-white text-base font-medium leading-6 whitespace-nowrap
                    transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
                    shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white
                  "
                  style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
                >
                  Choose medications
                  <ChevronRightIcon />
                </button>
              </div>
            </div>

            {/* OR divider */}
            <div className="flex items-center gap-3 py-4 px-5 bg-[#f4f4f5]">
              <div className="flex-1 h-px bg-[#d4d4d8]" />
              <span className="text-xs font-semibold text-[#71717a] tracking-widest uppercase">or</span>
              <div className="flex-1 h-px bg-[#d4d4d8]" />
            </div>

            {/* Card 2: Consult a provider */}
            <div
              className="rounded-bl-[24px] rounded-br-[24px] overflow-hidden"
              style={{ background: 'linear-gradient(268deg, #1d2d44 0%, #233d5a 100%)' }}
            >
              <div className="flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">
                    Need guidance?
                  </p>
                  <h2 className="text-xl font-semibold text-white leading-tight">
                    Consult a provider
                  </h2>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">$35</span>
                  <span className="text-sm text-white/60">consultation fee</span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-white/80">
                    <CheckBadgeIcon />
                    <span className="text-sm">20 minutes (video/phone)</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <CheckBadgeIcon />
                    <span className="text-sm">Personalized</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConsult}
                  disabled={isNavigating}
                  className="
                    w-full h-[42px] flex items-center justify-center gap-2 px-4
                    rounded-br-[36px] rounded-tl-[36px]
                    text-white text-base font-medium leading-6 whitespace-nowrap
                    transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
                    shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white
                  "
                  style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
                >
                  Book a live consultation
                  <ChevronRightIcon />
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>
    </>
  )
}
