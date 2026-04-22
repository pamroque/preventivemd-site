'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStepValues, clearSession } from '@/lib/intake-session-store'
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

// ─── Resume URL ───────────────────────────────────────────────────────────────
//
// step-N page saves to step index N-1. Mapping:
//   index 0  → personal info (/questionnaire)         next: step-2
//   index 1  → step-2                                 next: step-3
//   ...
//   index 9  → step-10                                next: step-11
//   index 10 → step-11                                next: visit-type
//   index 11 → visit-type (has visitType key)         next: choose-treatments | book-consultation
//   index 12 → choose-treatments | book-consultation  next: choose-medications | desired-treatments
//   index 13 → choose-medications | desired-treatments next: checkout

function getResumeHref(): string {
  const hasData = (step: number) => Object.keys(getStepValues(step)).length > 0

  if (!hasData(0)) return '/get-started/questionnaire'

  if (hasData(13)) return '/get-started/questionnaire/checkout'

  const s12 = getStepValues(12)
  if (typeof s12.format === 'string' && s12.format) return '/get-started/questionnaire/desired-treatments'
  if (typeof s12.treatments === 'string' && s12.treatments) return '/get-started/questionnaire/choose-medications'

  const s11 = getStepValues(11)
  if (typeof s11.visitType === 'string') {
    return s11.visitType === 'consult'
      ? '/get-started/questionnaire/book-consultation'
      : '/get-started/questionnaire/choose-treatments'
  }

  // step-N saves to index N-1, so if index I is done the next page is step-(I+2)
  if (hasData(10)) return '/get-started/questionnaire/visit-type'
  if (hasData(9))  return '/get-started/questionnaire/step-11'
  if (hasData(8))  return '/get-started/questionnaire/step-10'
  if (hasData(7))  return '/get-started/questionnaire/step-9'
  if (hasData(6))  return '/get-started/questionnaire/step-8'
  if (hasData(5))  return '/get-started/questionnaire/step-7'
  if (hasData(4))  return '/get-started/questionnaire/step-6'
  if (hasData(3))  return '/get-started/questionnaire/step-5'
  if (hasData(2))  return '/get-started/questionnaire/step-4'
  if (hasData(1))  return '/get-started/questionnaire/step-3'

  return '/get-started/questionnaire/step-2'
}

function getResumeCopy(): string {
  const s11 = getStepValues(11)
  if (typeof s11.visitType === 'string') {
    return s11.visitType === 'consult'
      ? 'Continue booking a consultation'
      : 'Continue medication request'
  }
  return 'Continue questionnaire'
}

// ─── Page ────────────────────────────────────────────────────────────────────

function ReactivationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const peptide = searchParams.get('peptide')
  const [firstName, setFirstName] = useState<string | null>(null)
  const [resumeHref, setResumeHref] = useState('/get-started/questionnaire')
  const [resumeCopy, setResumeCopy] = useState('Continue questionnaire')

  useEffect(() => {
    const s0 = getStepValues(0)
    setFirstName(typeof s0.firstName === 'string' ? s0.firstName : '')
    setResumeHref(getResumeHref())
    setResumeCopy(getResumeCopy())
  }, [])

  const questionText =
    firstName === null
      ? null
      : firstName
        ? `Welcome back, ${firstName}. If you\u2019d like, we can continue from where you stopped last time.`
        : `Welcome back! If you\u2019d like, we can continue from where you stopped last time.`

  const nameToken = firstName ? `${firstName}.` : null

  const { visibleWords, typingStarted, done, words } = useEveTyping(questionText, 0)

  function handleStartOver() {
    clearSession()
    const dest = peptide
      ? `/get-started?peptide=${encodeURIComponent(peptide)}`
      : '/get-started'
    router.push(dest)
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-white pt-12 md:pt-14 pb-24 focus:outline-none"
    >
      <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 py-6 md:py-9">

        {/* ── Eve's message ── */}
        <div className="flex items-start gap-3 w-full">
          <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
          </div>
          <p
            className="flex-1 min-w-0 text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
            aria-live="polite"
            aria-label={questionText ?? undefined}
          >
            {typingStarted && (
              <>
                {words.slice(0, visibleWords).map((word, i) => {
                  const isName = nameToken !== null && word === nameToken
                  return (
                    <span key={i} style={isName ? { color: '#0778ba' } : undefined}>
                      {word}{i < visibleWords - 1 ? ' ' : ''}
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
          </p>
        </div>

        {/* ── CTAs ── */}
        {done && (
          <div className="flex flex-col gap-6 items-center animate-[fadeIn_0.4s_ease_forwards]">

            {/* Primary CTA — copy adapts to resume point */}
            <button
              type="button"
              onClick={() => router.push(resumeHref)}
              className="
                relative w-full h-[42px] flex items-center justify-center gap-3 px-4
                overflow-hidden rounded-tl-[36px] rounded-br-[36px]
                text-white text-base font-medium leading-6 whitespace-nowrap
                transition-opacity hover:opacity-90
                shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
              "
              style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
            >
              {resumeCopy}
              <ChevronRightIcon />
            </button>

            {/* OR divider */}
            <div className="flex items-center gap-3 w-[180px]" aria-hidden="true">
              <div className="flex-1 h-px bg-[#d4d4d8]" />
              <span className="text-sm font-medium leading-5 text-[#71717a]">OR</span>
              <div className="flex-1 h-px bg-[#d4d4d8]" />
            </div>

            {/* Start from the beginning */}
            <button
              type="button"
              onClick={handleStartOver}
              className="
                w-full h-[42px] flex items-center justify-center px-4
                rounded-lg border border-[#e4e4e7] bg-white shadow-sm
                text-base font-medium text-[#0778ba] whitespace-nowrap
                hover:bg-gray-50 transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]
              "
            >
              Start from the beginning
            </button>

          </div>
        )}

      </div>
    </main>
  )
}

export default function ReactivationPage() {
  return (
    <Suspense>
      <ReactivationContent />
    </Suspense>
  )
}
