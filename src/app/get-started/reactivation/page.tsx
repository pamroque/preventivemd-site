'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStepValues, clearSession } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'
import { getSelectedGoals, getGoalQuestionSequence, AFTER_GOAL_QUESTIONS, GOAL_QUESTION_INDEX_MIN, GOAL_QUESTION_INDEX_MAX } from '@/lib/goal-routing'
import { isIntakeDisqualified } from '@/lib/disqualification'

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
//   index 11 → visit-type (has visitType key)         next: choose-treatments | desired-treatments
//   index 12 → choose-treatments | desired-treatments next: choose-medications | book-consultation
//   index 13 → choose-medications | book-consultation next: checkout
//
// Step 12 holds `treatments` in BOTH flows now, so we disambiguate using
// step 11's `visitType`. Step 13 holds `format` for consult and `choices`
// for async — the presence of `format` is the unambiguous consult signal.

function getResumeHref(): string {
  const hasData = (step: number) => Object.keys(getStepValues(step)).length > 0

  if (!hasData(0)) return '/get-started/questionnaire'

  // If the patient's saved answers would disqualify them at step-11,
  // resume there directly. Without this guard, a returning user could
  // navigate past the disqualification screen because the
  // index-based lookup below would route them to /visit-type or
  // wherever they last were in the questionnaire.
  if (isIntakeDisqualified()) {
    return '/get-started/questionnaire/disqualification'
  }

  // Step 13 done: consult → checkout if hold still alive, else /book-consultation;
  // async → checkout (no hold to worry about).
  if (hasData(13)) {
    const s13 = getStepValues(13)
    const isConsult = typeof s13.format === 'string' && !!s13.format
    if (!isConsult) return '/get-started/questionnaire/checkout'

    // Client-side TTL check on the saved expiresAt. /checkout still does
    // a server-authoritative validation on mount as the safety net.
    // 5s buffer absorbs clock skew between client and server.
    const expiresAt = typeof s13.expiresAt === 'string' ? s13.expiresAt : null
    const stillHeld = expiresAt && new Date(expiresAt).getTime() - Date.now() > 5_000
    return stillHeld
      ? '/get-started/questionnaire/checkout'
      : '/get-started/questionnaire/book-consultation'
  }

  // Step 12 done but step 13 not: branch by flow.
  const s12 = getStepValues(12)
  if (typeof s12.treatments === 'string' && s12.treatments) {
    const s11 = getStepValues(11)
    return s11.visitType === 'consult'
      ? '/get-started/questionnaire/book-consultation'
      : '/get-started/questionnaire/choose-medications'
  }

  const s11 = getStepValues(11)
  if (typeof s11.visitType === 'string') {
    return s11.visitType === 'consult'
      ? '/get-started/questionnaire/desired-treatments'
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

  // Check goal-question range (indices 50–89) then step-3
  if (hasData(2)) {
    for (let i = GOAL_QUESTION_INDEX_MIN; i <= GOAL_QUESTION_INDEX_MAX; i++) {
      if (hasData(i)) return AFTER_GOAL_QUESTIONS
    }
    const seq = getGoalQuestionSequence(getSelectedGoals())
    return seq.length > 0 ? seq[0].route : AFTER_GOAL_QUESTIONS
  }

  if (hasData(1))  return '/get-started/questionnaire/step-3'

  return '/get-started/questionnaire/step-2'
}

function getResumeCopy(): string {
  const s11 = getStepValues(11)
  if (typeof s11.visitType === 'string') {
    return s11.visitType === 'consult'
      ? 'Continue booking'
      : 'Request treatment'
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
      <div className="mx-auto w-full px-4 md:max-w-[560px] md:px-0 flex flex-col gap-6 py-9 md:py-12">

        {/* ── Eve's message ── */}
        <div className="flex items-start gap-3 w-full">
          <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
          </div>
          <h1
            className="flex-1 min-w-0 text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
            aria-live="polite"
            aria-label={questionText ?? undefined}
          >
            {typingStarted && (
              <>
                {words.slice(0, visibleWords).map((word, i) => {
                  const isName = nameToken !== null && word === nameToken
                  return (
                    <span key={i} style={isName ? { color: 'var(--brand-blue)' } : undefined}>
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
          </h1>
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
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
              "
              style={{ background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-blue) 64.61%, var(--brand-mint) 100%)' }}
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
                text-base font-medium text-brand-blue whitespace-nowrap
                hover:bg-gray-50 transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]
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
