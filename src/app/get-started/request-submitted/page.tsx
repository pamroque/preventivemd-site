'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getStepValues } from '@/lib/intake-session-store'

// ─── Assets ──────────────────────────────────────────────────────────────────

const LOGO_URL = '/assets/logo-full.svg'
const AVATAR_URL = '/assets/avatar-eve.png'
const ICON_WELCOME = '/assets/icon-welcome.svg'
const ICON_TREATMENTS = '/assets/icon-treatments.svg'
const ICON_GET_STARTED = '/assets/icon-get-started.svg'

// ─── Icons ───────────────────────────────────────────────────────────────────

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className={className ?? 'size-5'} aria-hidden="true">
      <path fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
        clipRule="evenodd" />
    </svg>
  )
}

function SignInIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5" aria-hidden="true">
      <path fillRule="evenodd"
        d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z"
        clipRule="evenodd" />
      <path fillRule="evenodd"
        d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Treatment colors ─────────────────────────────────────────────────────────

const TREATMENT_COLORS: Record<string, { bg: string; text: string }> = {
  'ghk-cu':      { bg: '#fef3c7', text: '#b45309' },
  'glp-1':       { bg: '#d1fae5', text: '#047857' },
  'glutathione': { bg: '#e0f2fe', text: '#0369a1' },
  'nad-plus':    { bg: '#f3e8ff', text: '#7c3aed' },
  'sermorelin':  { bg: '#fce7f3', text: '#be185d' },
}

const TREATMENT_NAMES: Record<string, string> = {
  'ghk-cu': 'GHK-Cu', 'glp-1': 'GLP-1', 'glutathione': 'Glutathione',
  'nad-plus': 'NAD+', 'sermorelin': 'Sermorelin',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateRequestId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RequestSubmittedPage() {
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [requestId] = useState(() => generateRequestId())
  const [medicationCards, setMedicationCards] = useState<
    { id: string; name: string; form: string | null; plan: string | null }[]
  >([])
  const [isVerifying, setIsVerifying] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const step0 = getStepValues(0)
    if (typeof step0.firstName === 'string') setFirstName(step0.firstName)
    if (typeof step0.phone === 'string') setPhone(step0.phone)

    const step12 = getStepValues(12)
    const step13 = getStepValues(13)
    let treatments: string[] = []
    if (typeof step12.treatments === 'string') {
      try { treatments = JSON.parse(step12.treatments) } catch { /* ignore */ }
    }
    let choices: Record<string, { type?: string; form?: string; plan?: string }> = {}
    if (typeof step13.choices === 'string') {
      try { choices = JSON.parse(step13.choices) } catch { /* ignore */ }
    }

    const cards = treatments.map(id => {
      const c = choices[id]
      let name: string
      if (id === 'glp-1' && c?.type) {
        name = c.type === 'semaglutide' ? 'Semaglutide' : 'Tirzepatide'
      } else {
        name = TREATMENT_NAMES[id] ?? id
      }
      const form = c?.form === 'injection' ? 'Injection' : c?.form === 'oral' ? 'Oral Tablets' : null
      const plan = c?.plan ? c.plan.replace('mo', ' month') : null
      return { id, name, form, plan }
    })
    setMedicationCards(cards)
  }, [])

  function handleVerify() {
    setIsVerifying(true)
    // In production: trigger SMS verification
    setTimeout(() => setIsVerifying(false), 2000)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Site header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e4e4e7] flex items-center justify-between px-4 h-16 md:px-8">
        <Link href="/" aria-label="PreventiveMD home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="PreventiveMD" className="h-8 object-contain" />
        </Link>
        <div className="flex items-center gap-4">
          <button type="button" className="text-xs font-medium text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.87)] transition-colors">
            Language
          </button>
          <button type="button" className="text-xs font-medium text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.87)] transition-colors">
            Accessibility
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pb-28" style={{ paddingBottom: '7rem' }}>
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-8 py-6 md:py-10">

          {/* Eve's message */}
          <div className="flex items-start gap-3 w-full">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)]">
                {firstName && (
                  <>
                    <span style={{ color: '#1976d2' }}>{firstName}</span>,{' '}
                  </>
                )}
                you are now one step closer to preventive care.
              </p>
            </div>
          </div>

          {/* ── Timeline ── */}
          <div className="flex flex-col">

            {/* Step 1: Active — Awaiting provider review */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                {/* Active teal dot */}
                <div
                  className="shrink-0 size-3 rounded-full mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #0778ba, #00b4c8)' }}
                  aria-hidden="true"
                />
                {/* Teal gradient line */}
                <div
                  className="w-px flex-1 mt-2"
                  style={{ background: 'linear-gradient(to bottom, #00b4c8, #e4e4e7)', minHeight: 24 }}
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 pb-4">
                <p className="text-xs font-semibold tracking-widest uppercase text-[#0778ba] leading-5">
                  Request #{requestId}: Awaiting provider review
                </p>
              </div>
            </div>

            {/* Medication carousel */}
            {medicationCards.length > 0 && (
              <div className="ml-7 mb-4">
                <div
                  ref={carouselRef}
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {medicationCards.map((card, i) => {
                    const colors = TREATMENT_COLORS[card.id] ?? { bg: '#f4f4f5', text: '#71717a' }
                    return (
                      <div
                        key={i}
                        className="shrink-0 w-36 rounded-xl border border-[#e4e4e7] p-3 flex flex-col gap-2"
                      >
                        {/* Color block representing medication */}
                        <div
                          className="w-full h-16 rounded-lg flex items-center justify-center"
                          style={{ background: colors.bg }}
                        >
                          <span className="text-2xl font-bold" style={{ color: colors.text }}>
                            {card.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[rgba(0,0,0,0.87)] leading-4">{card.name}</p>
                          {card.form && (
                            <p className="text-[10px] text-[rgba(0,0,0,0.5)] leading-4">{card.form}</p>
                          )}
                          {card.plan && (
                            <span
                              className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                              style={{ background: colors.bg, color: colors.text }}
                            >
                              {card.plan}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Grey — Medication delivery */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="shrink-0 size-3 rounded-full mt-0.5 bg-[#d4d4d8]" aria-hidden="true" />
                <div className="w-px flex-1 mt-2 bg-[#e4e4e7]" aria-hidden="true" />
              </div>
              <div className="flex-1 pb-4">
                <p className="text-xs font-semibold tracking-widest uppercase text-[rgba(0,0,0,0.4)] leading-5">
                  If approved: Medication delivery
                </p>
              </div>
            </div>

            {/* Step 3: Grey — Provider review note */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="shrink-0 size-3 rounded-full mt-0.5 bg-[#d4d4d8]" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[rgba(0,0,0,0.4)] leading-5">
                  A licensed provider reviews your request
                </p>
              </div>
            </div>

          </div>

          {/* ── Care portal sign-in ── */}
          <div className="flex flex-col gap-5 rounded-2xl border border-[#e4e4e7] p-5">
            <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
              To manage your treatments and get ongoing support, sign in to your Care Portal.
            </p>

            {/* Phone display */}
            <div className="flex flex-col gap-2">
              <label htmlFor="verify-phone" className="text-sm font-medium text-[#09090b] leading-5">
                Mobile number
              </label>
              <div className="w-full h-[42px] px-3 py-1.5 bg-[#f9f9f9] border border-[#e4e4e7] rounded-lg shadow-sm flex items-center gap-0">
                <span className="text-sm text-[#09090b] opacity-50 shrink-0">+1&nbsp;</span>
                <span id="verify-phone" className="text-base text-[rgba(0,0,0,0.87)]">{phone}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying}
              className="
                w-full h-[42px] flex items-center justify-center gap-2 px-4
                rounded-[21px]
                text-white text-base font-medium leading-6
                transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
                shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
              "
              style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
            >
              {isVerifying ? 'Sending code…' : 'Sign in and verify number'}
            </button>

            <p className="text-xs text-center text-[rgba(0,0,0,0.5)]">
              Registered the wrong number?{' '}
              <Link href="/contact" className="font-semibold text-[#0778ba] underline tracking-wide uppercase text-[10px]">
                Contact us
              </Link>
            </p>
          </div>

          {/* Success badge */}
          <div className="flex items-center gap-2 justify-center">
            <CheckCircleIcon className="size-4 text-[#047857]" />
            <p className="text-xs font-medium text-[#047857]">
              Request submitted successfully
            </p>
          </div>

        </div>
      </main>

      {/* ── Bottom nav ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2"
        aria-label="Main navigation"
      >
        <div
          className="w-full md:w-[480px] flex items-center justify-around px-2 py-2 rounded-tl-[36px] rounded-br-[36px]"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
          }}
        >
          {[
            { label: 'Welcome', icon: ICON_WELCOME, href: '/', active: false },
            { label: 'Treatments', icon: ICON_TREATMENTS, href: '/treatments', active: false },
            { label: 'Get started', icon: ICON_GET_STARTED, href: '/get-started', active: true },
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors hover:bg-black/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.icon}
                alt=""
                className="size-5 object-contain"
                style={item.active ? { filter: 'invert(28%) sepia(80%) saturate(500%) hue-rotate(175deg)' } : { opacity: 0.4 }}
              />
              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: item.active ? '#0778ba' : 'rgba(0,0,0,0.4)' }}
              >
                {item.label}
              </span>
            </Link>
          ))}

          {/* Sign in — inline icon */}
          <button
            type="button"
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors hover:bg-black/5"
          >
            <SignInIcon />
            <span className="text-[10px] font-medium leading-none text-[rgba(0,0,0,0.4)]">Sign in</span>
          </button>
        </div>
      </nav>

    </div>
  )
}
