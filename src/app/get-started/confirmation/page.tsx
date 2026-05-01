'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getStepValues, getSubmission, markSubmitted } from '@/lib/intake-session-store'
import { usePrefersReducedMotion } from '@/lib/useEveTyping'
import { inferChannel, normalizePhone } from '@/lib/portal-auth'
import { setPortalAuthFlow } from '@/lib/portal-auth-flow'

// ─── Assets ──────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'
const MEDICATION_IMAGE_URL =
  'https://www.figma.com/api/mcp/asset/ba330a34-0013-4388-a4bc-40b5574691d6'

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

function VideoCameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
      stroke="currentColor" className="size-5 text-[#1d2d44] shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
      stroke="currentColor" className="size-5 text-[#1d2d44] shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 6.75Z" />
    </svg>
  )
}

// ─── Timeline primitives ──────────────────────────────────────────────────────

function ActiveDot() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="activeDotGrad" x1="0" y1="0" x2="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A2D5BC" />
          <stop offset="1" stopColor="#3A5190" />
        </linearGradient>
      </defs>
      <circle cx="6" cy="6" r="5" stroke="url(#activeDotGrad)" strokeWidth="2" />
    </svg>
  )
}

function InactiveDot() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="6" cy="6" r="5" stroke="#bdbdbd" strokeWidth="2" />
    </svg>
  )
}

function TimelineConnector({ height, gradient = false }: { height: number; gradient?: boolean }) {
  return (
    <div className="flex flex-col items-center shrink-0 w-3" aria-hidden="true">
      <div
        className="w-0.5"
        style={{
          height,
          background: gradient ? 'linear-gradient(to bottom, #A2D5BC, #3A5190)' : '#bdbdbd',
        }}
      />
    </div>
  )
}

// ─── Treatment badge config ───────────────────────────────────────────────────

const BADGE_CONFIG: Record<string, { bg: string; text: string }> = {
  'ghk-cu':            { bg: 'bg-[#fef3c7]', text: 'text-[#b45309]' },
  'glp-1-semaglutide': { bg: 'bg-[#e0e7ff]', text: 'text-[#4338ca]' },
  'glp-1-tirzepatide': { bg: 'bg-[#d1fae5]', text: 'text-[#047857]' },
  'glp-1':             { bg: 'bg-[#d1fae5]', text: 'text-[#047857]' },
  'glutathione':       { bg: 'bg-[#ffe4e6]', text: 'text-[#be123c]' },
  'nad-plus':          { bg: 'bg-[#dcfce7]', text: 'text-[#15803d]' },
  'sermorelin':        { bg: 'bg-[#f3e8ff]', text: 'text-[#7e22ce]' },
}

const TREATMENT_NAMES: Record<string, string> = {
  'ghk-cu': 'GHK-Cu', 'glp-1': 'GLP-1', 'glutathione': 'Glutathione',
  'nad-plus': 'NAD+', 'sermorelin': 'Sermorelin',
}

function MedicationItem({ label, badgeBg, badgeText }: { label: string; badgeBg: string; badgeText: string }) {
  return (
    <div
      role="listitem"
      tabIndex={0}
      aria-label={label}
      className="flex items-center gap-1 shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2"
    >
      <div className="h-[72px] w-[38px] relative shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MEDICATION_IMAGE_URL}
          alt=""
          aria-hidden="true"
          className="absolute max-w-none"
          style={{ height: '111.62%', left: '-106.45%', top: '-6.99%', width: '317.27%' }}
        />
      </div>
      <span className={`${badgeBg} ${badgeText} text-xs font-normal leading-4 px-1.5 py-1 rounded-xl shrink-0`}>
        {label}
      </span>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateRequestId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function formatPlan(plan: string): string {
  const months = parseInt(plan)
  if (isNaN(months)) return plan
  return `${months} mo${months > 1 ? 's' : ''}`
}

const MONTH_ABBRS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatConsultDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${MONTH_ABBRS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

// ─── Animation ───────────────────────────────────────────────────────────────

const SUFFIX_WORDS = 'you are now one step closer to preventive care.'.split(' ')
const WORD_DELAY_MS = 80

function usePageAnimation(firstName: string) {
  const reducedMotion = usePrefersReducedMotion()
  const [animateBubble, setAnimateBubble] = useState(false)
  const [typingStarted, setTypingStarted] = useState(false)
  const [visibleWords, setVisibleWords] = useState(0)
  const [done, setDone] = useState(false)

  const words = firstName ? [`${firstName},`, ...SUFFIX_WORDS] : SUFFIX_WORDS

  useEffect(() => {
    if (!reducedMotion) return
    setAnimateBubble(true)
    setTypingStarted(true)
    setVisibleWords(words.length)
    setDone(true)
  }, [reducedMotion, words.length])

  useEffect(() => {
    if (reducedMotion) return
    const t = setTimeout(() => setAnimateBubble(true), 100)
    return () => clearTimeout(t)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    if (!animateBubble) return
    const t = setTimeout(() => setTypingStarted(true), 600)
    return () => clearTimeout(t)
  }, [reducedMotion, animateBubble])

  useEffect(() => {
    if (reducedMotion) return
    if (!typingStarted) return
    const wordCount = firstName ? SUFFIX_WORDS.length + 1 : SUFFIX_WORDS.length
    if (visibleWords < wordCount) {
      const t = setTimeout(() => setVisibleWords(w => w + 1), WORD_DELAY_MS)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => setDone(true), 200)
      return () => clearTimeout(t)
    }
  }, [reducedMotion, typingStarted, visibleWords, firstName])

  return { animateBubble, typingStarted, visibleWords, done, words }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ConfirmationPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  // Read-or-create: preserves the ID across page refreshes and revisits. The
  // existing submission record is consulted first so a user coming back to
  // /confirmation (or redirected here by ReactivationGate) sees the same
  // Request #XYZ they saw the first time. The actual persistence happens in
  // the useEffect below so we don't write to sessionStorage during render.
  const [requestId] = useState(() => {
    const existing = getSubmission()
    return existing ? existing.requestId : generateRequestId()
  })

  useEffect(() => {
    if (getSubmission()) return
    markSubmitted({ requestId, submittedAt: Date.now() })
  }, [requestId])
  const [medicationItems, setMedicationItems] = useState<
    { id: string; label: string; badgeBg: string; badgeText: string }[]
  >([])
  const [credential, setCredential] = useState('')
  const [credentialError, setCredentialError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  // Detect flow on the client only — sessionStorage is empty during SSR, so
  // initializing here would always render the async-flow copy on the server
  // and trigger a hydration mismatch when the client flips it to consultation.
  const [isConsultation, setIsConsultation] = useState(false)
  const [consultationDetails, setConsultationDetails] = useState<{
    format: 'Video' | 'Phone'
    dateLabel: string
    time: string
  } | null>(null)

  useEffect(() => {
    const step0 = getStepValues(0)
    if (typeof step0.firstName === 'string') setFirstName(step0.firstName)

    const step12 = getStepValues(12)
    const consultFlow = typeof step12.format === 'string' && !!step12.format
    setIsConsultation(consultFlow)

    if (consultFlow) {
      const fmt = (typeof step12.format === 'string' ? step12.format : 'Video') as 'Video' | 'Phone'
      const dateLabel = typeof step12.date === 'string' ? formatConsultDate(step12.date) : ''
      const time = typeof step12.time === 'string' ? step12.time : ''
      setConsultationDetails({ format: fmt, dateLabel, time })
    } else {
      const step13 = getStepValues(13)
      let treatments: string[] = []
      if (typeof step12.treatments === 'string') {
        try { treatments = JSON.parse(step12.treatments) } catch { /* ignore */ }
      }
      let choices: Record<string, { type?: string; plan?: string }> = {}
      if (typeof step13.choices === 'string') {
        try { choices = JSON.parse(step13.choices) } catch { /* ignore */ }
      }

      const items = treatments.map(id => {
        const c = choices[id]
        let name: string
        if (id === 'glp-1' && c?.type) {
          name = c.type === 'semaglutide' ? 'Semaglutide' : 'Tirzepatide'
        } else {
          name = TREATMENT_NAMES[id] ?? id
        }
        const plan = c?.plan ? formatPlan(c.plan) : null
        const badgeKey = id === 'glp-1' && c?.type ? `glp-1-${c.type}` : id
        const cfg = BADGE_CONFIG[badgeKey] ?? BADGE_CONFIG[id] ?? { bg: 'bg-[#f4f4f5]', text: 'text-[#71717a]' }
        return {
          id,
          label: plan ? `${name} (${plan})` : name,
          badgeBg: cfg.bg,
          badgeText: cfg.text,
        }
      })
      setMedicationItems(items)
    }
  }, [])

  const { animateBubble, typingStarted, visibleWords, done, words } = usePageAnimation(firstName)

  function handleSignIn() {
    if (isSigningIn) return
    const trimmed = credential.trim()
    if (!trimmed) {
      setCredentialError('Please enter your email or mobile number.')
      return
    }
    const channel = inferChannel(trimmed)
    if (!channel) {
      setCredentialError('Please enter a valid email or 10-digit mobile number.')
      return
    }
    setCredentialError('')
    setIsSigningIn(true)
    // Skip /sign-in step 1 — they've already entered their identifier here.
    const stored = channel === 'email' ? trimmed.toLowerCase() : normalizePhone(trimmed)
    setPortalAuthFlow({ identifier: stored, channel })
    router.push('/sign-in/verify')
  }

  function handleCredentialChange(val: string) {
    setCredential(val)
    if (credentialError) setCredentialError('')
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto focus:outline-none"
        style={{ marginTop: '48px', paddingBottom: '88px' }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 py-4 md:py-6">

          {/* ── Response bubble ── */}
          <div className="flex flex-col items-end">
            <div
              className="bg-[#f0f0f0] px-3 py-1 rounded-full text-sm text-[rgba(0,0,0,0.6)] whitespace-nowrap transition-all duration-500"
              style={animateBubble
                ? { opacity: 1, transform: 'translateY(0)' }
                : { opacity: 0, transform: 'translateY(6px)' }
              }
            >
              {isConsultation ? 'Consultation booked ✅' : 'Request submitted ✅'}
            </div>
          </div>

          {/* ── Eve's message ── */}
          <div className="flex items-start gap-3 w-full">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <h1
              className="flex-1 min-w-0 text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
              aria-live="polite"
              aria-label={firstName
                ? `${firstName}, you are now one step closer to preventive care.`
                : 'You are now one step closer to preventive care.'
              }
            >
              {typingStarted && (
                <>
                  {words.slice(0, visibleWords).map((word, i) => (
                    <span key={i} style={i === 0 && firstName ? { color: '#1976d2' } : undefined}>
                      {word}{i < visibleWords - 1 ? ' ' : ''}
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

          {/* ── Timeline + sign-in card ── */}
          {done && (
            <>
              <section
                aria-label="Request status"
                className="flex flex-col animate-[fadeIn_0.4s_ease_forwards]"
              >
                {/* Item 1 */}
                <div className="flex items-center gap-4">
                  <ActiveDot />
                  <p className="text-sm text-[rgba(0,0,0,0.87)] flex-1 min-w-0">
                    <span className="font-medium text-xs tracking-[1px] uppercase">
                      {isConsultation ? `Visit #${requestId}:` : `Request #${requestId}:`}
                    </span>
                    {' '}{isConsultation ? 'Upcoming live consultation' : 'Awaiting provider review'}
                  </p>
                </div>

                {/* Connector + middle content */}
                <div className="flex items-stretch gap-4">
                  <TimelineConnector height={96} gradient />
                  <div className="flex-1 min-w-0 flex items-center">
                    {isConsultation && consultationDetails ? (
                      /* Consultation: format icon + date badge */
                      <div className="flex flex-col gap-1.5 py-3">
                        <div className="flex items-center gap-2">
                          {consultationDetails.format === 'Video' ? <VideoCameraIcon /> : <PhoneIcon />}
                          <span className="text-sm font-medium text-[#1d2d44]">
                            {consultationDetails.format === 'Video' ? 'Video Call' : 'Phone Call'}
                          </span>
                        </div>
                        <div className="inline-flex self-start items-center border border-[#1d2d44] rounded-xl px-1.5 py-1">
                          <span className="text-[12px] text-[#1d2d44] leading-4 whitespace-nowrap">
                            {consultationDetails.dateLabel} @ {consultationDetails.time}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Async: medication carousel */
                      <div className="relative w-full overflow-hidden pl-3">
                        <div
                          className="absolute left-0 top-0 bottom-0 w-9 z-10 pointer-events-none"
                          aria-hidden="true"
                          style={{ background: 'linear-gradient(to right, white, transparent)' }}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-9 z-10 pointer-events-none"
                          aria-hidden="true"
                          style={{ background: 'linear-gradient(to left, white, transparent)' }}
                        />
                        <div
                          role="list"
                          aria-label="Your selected medications"
                          className="flex gap-4 items-center overflow-x-auto"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                          {medicationItems.map((item, i) => (
                            <MedicationItem
                              key={i}
                              label={item.label}
                              badgeBg={item.badgeBg}
                              badgeText={item.badgeText}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex items-center gap-4">
                  <InactiveDot />
                  <p className="text-sm text-[rgba(0,0,0,0.87)] flex-1 min-w-0">
                    <span className="font-medium text-xs tracking-[1px] uppercase">If approved:</span>
                    {' '}{isConsultation ? 'Prescription & medication delivery' : 'Medication delivery'}
                  </p>
                </div>
              </section>

              {/* ── Care portal sign-in card ── */}
              <div
                className="overflow-hidden border border-[#e3e3e3] rounded-bl-[36px] rounded-tr-[36px] flex flex-col bg-white"
                style={{ boxShadow: '0px 4px 16px 0px rgba(0,0,0,0.15)', animation: 'fadeIn 0.4s ease 100ms both' }}
              >
                {/* Heading bar — edge-to-edge: gradient thumbnail + dark navy text panel */}
                <div className="flex items-stretch bg-[#A2D5BC]">
                  <div className="shrink-0 size-[84px] flex items-center justify-center bg-gradient-to-r from-[#3A5190] to-[#A2D5BC]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/assets/cta-medications.png"
                      alt=""
                      className="size-16 object-contain"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 flex items-center bg-[rgba(29,45,68,0.95)] px-4">
                    <p className="text-base font-medium leading-6 text-white">
                      {isConsultation
                        ? 'Manage your appointment through your Care Portal'
                        : 'Stay on top of your treatments through your Care Portal'}
                    </p>
                  </div>
                </div>

                {/* Form area */}
                <div className="flex flex-col gap-4 px-6 py-5">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="credential" className="text-[12px] font-medium tracking-[1.5px] uppercase text-[#71717a]">
                      Email or mobile number
                    </label>
                    <div className={`h-[42px] border rounded-lg shadow-sm flex items-center overflow-hidden bg-white transition-colors ${credentialError ? 'border-red-600 focus-within:border-red-600' : credential ? 'border-[#3A5190]' : 'border-[#e4e4e7] focus-within:border-[#3A5190]'}`}>
                      <input
                        id="credential"
                        type="text"
                        inputMode="email"
                        autoComplete="username"
                        value={credential}
                        onChange={e => handleCredentialChange(e.target.value)}
                        aria-describedby={credentialError ? 'credential-error' : undefined}
                        aria-invalid={!!credentialError}
                        aria-required="true"
                        className="flex-1 h-full px-3 text-base text-[rgba(0,0,0,0.87)] focus:outline-none bg-transparent border-0"
                      />
                    </div>
                    {credentialError && (
                      <p id="credential-error" className="text-xs text-red-600 leading-4 mt-1" role="alert">
                        {credentialError}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="
                      w-full h-[42px] flex items-center justify-center gap-2 px-4
                      rounded-[21px]
                      text-white text-base font-medium leading-6
                      transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
                      shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
                    "
                    style={{ background: 'linear-gradient(90deg, #3A5190 0%, #3A5190 64.61%, #A2D5BC 100%)' }}
                  >
                    {isSigningIn ? 'Signing in…' : 'Sign in'}
                    <ChevronRightIcon />
                  </button>

                  <div className="flex flex-col items-center gap-0.5">
                    <p className="text-sm text-center text-[rgba(0,0,0,0.6)] leading-[1.43] tracking-[0.17px]">
                      If having issues signing in, contact
                    </p>
                    <p className="text-sm text-center text-[rgba(0,0,0,0.6)] leading-[1.43] tracking-[0.17px]">
                      <a
                        href="tel:+19876543210"
                        className="font-medium text-[#3A5190] underline decoration-solid underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] rounded-sm"
                      >
                        +1 (987) 654-3210
                      </a>
                      {' or '}
                      <a
                        href="mailto:hello@preventivemd.com"
                        className="font-medium text-[#3A5190] underline decoration-solid underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] rounded-sm"
                      >
                        hello@preventivemd.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
