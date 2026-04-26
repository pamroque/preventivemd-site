'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { US_STATES } from '@/lib/us-states'
import {
  getPriorSteps,
  getStepValues,
  saveStep,
  buildIntakeData,
} from '@/lib/intake-session-store'
import { defaultIntakeData, type IntakeData } from '@/lib/intake-flow'
import { submitIntake } from '@/lib/supabase/submit-intake'
import { useEveTyping } from '@/lib/useEveTyping'

const QUESTION_TEXT = 'Finally, some last few details to process your request.'

// ─── Assets ──────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'
const BADGE_HIPAA = '/assets/badge-hipaa.png'
const BADGE_SSL = '/assets/badge-ssl.png'
const BADGE_LEGIT = '/assets/badge-legit.png'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPhone(digits: string): string {
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ChevronUpDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 shrink-0 text-[#71717a]" aria-hidden="true">
      <path fillRule="evenodd"
        d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3ZM6.2 12.24a.75.75 0 0 1 1.1-1.02L10 14.148l2.7-2.908a.75.75 0 1 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit US phone number'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  street: z.string().min(1, 'Street address is required'),
  apt: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  deliveryState: z.string().min(1, 'State is required'),
  zip: z.string().regex(/^\d{5}$/, 'Enter a valid 5-digit ZIP code'),
  paymentMethod: z.enum(['card', 'pay']),
  cardNumber: z.string().optional(),
  expiration: z.string().optional(),
  security: z.string().optional(),
  cardName: z.string().optional(),
  sameAsDelivery: z.boolean(),
  billingStreet: z.string().optional(),
  billingApt: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'card') {
    const digits = (data.cardNumber ?? '').replace(/\s/g, '')
    if (!digits || !/^\d{16}$/.test(digits)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid 16-digit card number', path: ['cardNumber'] })
    }
    if (!data.expiration || !/^\d{2}\/\d{2}$/.test(data.expiration)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter MM/YY', path: ['expiration'] })
    }
    if (!data.security || !/^\d{3,4}$/.test(data.security)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter 3–4 digits', path: ['security'] })
    }
    if (!data.cardName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cardholder name is required', path: ['cardName'] })
    }
    if (!data.sameAsDelivery) {
      if (!data.billingStreet?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Street address is required', path: ['billingStreet'] })
      if (!data.billingCity?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'City is required', path: ['billingCity'] })
      if (!data.billingState) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'State is required', path: ['billingState'] })
      if (!data.billingZip || !/^\d{5}$/.test(data.billingZip)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid ZIP', path: ['billingZip'] })
    }
  }
})

type FormValues = z.infer<typeof checkoutSchema>

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputBase =
  'w-full h-[42px] px-3 py-1.5 bg-white border border-[#e4e4e7] rounded-lg shadow-sm ' +
  'text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] ' +
  'focus:outline-none focus:border-[#0778ba] focus-within:border-[#0778ba] transition-colors'

const inputErrorCls = 'border-red-600 focus:border-red-600 focus-within:border-red-600'

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="text-xs text-red-600 leading-4 mt-1" role="alert">{message}</p>
}

function SectionHeader({ label }: { label: string }) {
  return (
    <span className="text-[12px] font-medium tracking-[1.5px] uppercase text-[rgba(0,0,0,0.45)]">
      {label}
    </span>
  )
}

// ─── Consultation helpers ─────────────────────────────────────────────────────

const MONTH_ABBRS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatConsultDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${MONTH_ABBRS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function VideoCallIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
      stroke="currentColor" className="size-5 text-white shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
    </svg>
  )
}

function PhoneCallIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
      stroke="currentColor" className="size-5 text-white shrink-0" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 6.75Z" />
    </svg>
  )
}

// ─── Plan prices ─────────────────────────────────────────────────────────────

const PLAN_PRICES: Record<string, number> = { '1mo': 149, '3mo': 417, '6mo': 774, '12mo': 1188 }

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 90

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()
  const [dueToday, setDueToday] = useState(0)
  const [cartItems, setCartItems] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [isAndroid, setIsAndroid] = useState(false)

  // The sticky CTA + cart grows with the number of treatments. Measure it so
  // the main scroll region always has enough bottom padding to clear it.
  const stickyCtaRef = useRef<HTMLDivElement>(null)
  const [stickyCtaHeight, setStickyCtaHeight] = useState(144)

  // Detect consultation flow synchronously so backHref and CTA are correct immediately
  const [isConsultation] = useState(() => {
    const s12 = getStepValues(12)
    return typeof s12.format === 'string' && !!s12.format
  })
  const [consultationDetails, setConsultationDetails] = useState<{
    format: 'Video' | 'Phone'
    dateLabel: string
    time: string
  } | null>(null)

  // Read step 0 synchronously so values are available for useForm defaultValues
  const step0Snapshot = getStepValues(0)
  const stateFromStep0 = typeof step0Snapshot.state === 'string' ? step0Snapshot.state : ''
  const phoneFromStep0 = typeof step0Snapshot.phone === 'string' ? step0Snapshot.phone : ''

  const [phoneDisplay, setPhoneDisplay] = useState(() => formatPhone(phoneFromStep0))

  useEffect(() => {
    const el = stickyCtaRef.current
    if (!el) return
    const update = () => setStickyCtaHeight(el.getBoundingClientRect().height)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setIsAndroid(/android/i.test(navigator.userAgent))

    const prior = getPriorSteps(14)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({
        ...last,
        editHref: isConsultation
          ? '/get-started/questionnaire/desired-treatments'
          : '/get-started/questionnaire/choose-medications',
      })
    }

    const step12 = getStepValues(12)

    if (isConsultation) {
      setDueToday(35)
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
      let choices: Record<string, { type?: string; form?: string; plan?: string }> = {}
      if (typeof step13.choices === 'string') {
        try { choices = JSON.parse(step13.choices) } catch { /* ignore */ }
      }

      const TREATMENT_NAMES: Record<string, string> = {
        'ghk-cu': 'GHK-Copper', 'glp-1': 'GLP-1', 'glutathione': 'Glutathione',
        'nad-plus': 'NAD+', 'sermorelin': 'Sermorelin',
      }

      let total = 0
      const items: string[] = []
      treatments.forEach(id => {
        const c = choices[id]
        const plan = c?.plan
        if (plan) total += PLAN_PRICES[plan] ?? 0
        const name = id === 'glp-1' && c?.type
          ? (c.type === 'semaglutide' ? 'Semaglutide' : 'Tirzepatide')
          : (TREATMENT_NAMES[id] ?? id)
        const form = c?.form === 'injection' ? 'Injections' : c?.form === 'oral' ? 'Oral Tablets' : null
        const planLabel = plan ? plan.replace('mo', ' mo') : null
        if (form && planLabel) items.push(`${name} ${form} (${planLabel})`)
      })
      setDueToday(total)
      setCartItems(items)
    }
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      phone: phoneFromStep0,
      paymentMethod: 'card',
      sameAsDelivery: true,
      deliveryState: stateFromStep0,
    },
  })

  const paymentMethod = watch('paymentMethod')
  const sameAsDelivery = watch('sameAsDelivery')
  const isAltPay = paymentMethod === 'pay'
  const altPayLabel = isAndroid ? 'Google Pay' : 'Apple Pay'

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  function handlePhoneInput(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhoneDisplay(formatPhone(digits))
    setValue('phone', digits, { shouldValidate: false, shouldDirty: true })
  }

  function handleCardInput(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16)
    setValue('cardNumber', digits, { shouldValidate: false })
    e.target.value = digits.replace(/(.{4})/g, '$1 ').trim()
  }

  function handleExpInput(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2)
    setValue('expiration', v, { shouldValidate: false })
    e.target.value = v
  }

  async function onSubmit(data: FormValues) {
    // Existing local persistence — keeps the chat-history bubbles and
    // back-navigation behavior intact.
    saveStep(
      14,
      { question: 'Checkout details', bubbles: [data.email] },
      {
        email: data.email,
        street: data.street,
        city: data.city,
        deliveryState: data.deliveryState,
        zip: data.zip,
        sameAsDelivery: data.sameAsDelivery,
        ...(data.billingStreet ? { billingStreet: data.billingStreet } : {}),
      }
    )

    // Build the canonical IntakeData. Form pages save their own field
    // names ("dateOfBirth", "goals" comma-string, etc.) — the mapper in
    // intake-session-store translates those into IntakeData shape.
    const mapped = buildIntakeData()
    const intakeData: IntakeData = {
      ...defaultIntakeData,
      ...(mapped as Partial<IntakeData>),
    }

    // Read the draft session token (if /api/intake/draft set one).
    let sessionToken: string | undefined
    try {
      sessionToken = document.cookie
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('intake_session='))
        ?.split('=')[1]
    } catch { /* no cookie access */ }

    const result = await submitIntake(
      intakeData,
      {
        email:         data.email,
        street:        data.street,
        apt:           data.apt,
        city:          data.city,
        zip:           data.zip,
        paymentMethod: data.paymentMethod,
      },
      sessionToken,
    )

    if (!result.success) {
      // Non-blocking: if the backend submit fails (network, server error),
      // we still route to confirmation so the patient sees the success
      // screen. The intake exists in sessionStorage and ops can recover.
      // We log so this is visible in Sentry / browser logs later.
      console.error('Intake submission failed:', result.error)
    }

    router.push('/get-started/confirmation')
  }

  return (
    <>
      <IntakeHeader
        backHref={isConsultation
          ? '/get-started/questionnaire/desired-treatments'
          : '/get-started/questionnaire/choose-medications'}
        progress={PROGRESS}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto bg-white focus:outline-none"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: `${stickyCtaHeight + 16}px`,
          // Match the CTA height so focus-into-view never lands a field
          // underneath the sticky cart bar (WCAG 2.4.11).
          scrollPaddingBottom: `${stickyCtaHeight + 16}px`,
        }}
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

          {/* ── Form ── */}
          {done && (
            <form
              id="checkout-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-12 animate-[fadeIn_0.4s_ease_forwards]"
            >

              {/* ACCOUNT DETAILS */}
              <div className="flex flex-col gap-4">
                <SectionHeader label="Account Details" />

                <p className="text-sm font-bold leading-5 text-[#0778ba]">
                  To sign in to your Care Portal later, make sure you have access to your mobile number or email so we can send you a one-time passcode (OTP).
                </p>

                {/* Phone — pre-filled, editable, required */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone" className="text-sm font-medium text-[#09090b] leading-5">
                    Mobile number <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                  </label>
                  <div className={`${inputBase} flex items-center !px-0 overflow-hidden ${errors.phone ? inputErrorCls : ''}`}>
                    <span aria-hidden="true" className="px-3 text-base text-[rgba(0,0,0,0.87)] opacity-50 shrink-0 border-r border-[#e4e4e7]">+1</span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="(###) ###-####"
                      value={phoneDisplay}
                      onChange={handlePhoneInput}
                      className="flex-1 h-full bg-transparent text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] focus:outline-none border-0 px-3"
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? 'phone-error' : undefined}
                      aria-required="true"
                    />
                  </div>
                  <FieldError id="phone-error" message={errors.phone?.message} />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-[#09090b] leading-5">
                    Email <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email')}
                    className={`${inputBase} ${errors.email ? inputErrorCls : ''}`}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    aria-required="true"
                  />
                  <FieldError id="email-error" message={errors.email?.message} />
                </div>
              </div>

              {/* DELIVERY ADDRESS */}
              <div className="flex flex-col gap-4">
                <SectionHeader label="Delivery Address" />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="street" className="text-sm font-medium text-[#09090b] leading-5">
                    Street address <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                  </label>
                  <input
                    id="street"
                    type="text"
                    autoComplete="address-line1"
                    {...register('street')}
                    className={`${inputBase} ${errors.street ? inputErrorCls : ''}`}
                    aria-invalid={!!errors.street}
                    aria-describedby={errors.street ? "street-error" : undefined}
                    aria-required="true"
                  />
                  <FieldError id="street-error" message={errors.street?.message} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="apt" className="text-sm font-medium text-[#09090b] leading-5">
                    Apt, suite, etc.
                  </label>
                  <input
                    id="apt"
                    type="text"
                    autoComplete="address-line2"
                    {...register('apt')}
                    className={inputBase}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="city" className="text-sm font-medium text-[#09090b] leading-5">
                    City <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    autoComplete="address-level2"
                    {...register('city')}
                    className={`${inputBase} ${errors.city ? inputErrorCls : ''}`}
                    aria-invalid={!!errors.city}
                    aria-describedby={errors.city ? "city-error" : undefined}
                    aria-required="true"
                  />
                  <FieldError id="city-error" message={errors.city?.message} />
                </div>

                <div className="flex gap-3 items-start">
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <label htmlFor="deliveryState" className="text-sm font-medium text-[#09090b] leading-5">
                      State <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                    </label>
                    <div className="relative opacity-50">
                      <select
                        id="deliveryState"
                        value={stateFromStep0}
                        disabled
                        onChange={() => {}}
                        className={`${inputBase} appearance-none pr-8 cursor-not-allowed`}
                        aria-disabled="true"
                      >
                        <option value="" disabled>Select a state</option>
                        {US_STATES.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                        <ChevronUpDownIcon />
                      </span>
                    </div>
                    <FieldError id="deliveryState-error" message={errors.deliveryState?.message} />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <label htmlFor="zip" className="text-sm font-medium text-[#09090b] leading-5">
                      ZIP code <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                    </label>
                    <input
                      id="zip"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={5}
                      {...register('zip')}
                      className={`${inputBase} ${errors.zip ? inputErrorCls : ''}`}
                      aria-invalid={!!errors.zip}
                    aria-describedby={errors.zip ? "zip-error" : undefined}
                    aria-required="true"
                    />
                    <FieldError id="zip-error" message={errors.zip?.message} />
                  </div>
                </div>
              </div>

              {/* PAYMENT DETAILS */}
              <div className="flex flex-col gap-4">
                <SectionHeader label="Payment Details" />

                {/* Card / Apple Pay (or Google Pay) toggle — native radios so AT
                    announces the group + selected state, and arrow keys work. */}
                <div
                  role="radiogroup"
                  aria-label="Payment method"
                  className="flex rounded-lg border border-[#e4e4e7] overflow-hidden shadow-sm"
                >
                  {(['card', 'pay'] as const).map(method => {
                    const isActive = paymentMethod === method
                    const label = method === 'card' ? 'Card' : altPayLabel
                    return (
                      <label
                        key={method}
                        className={`flex-1 h-10 flex items-center justify-center cursor-pointer text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-[#0778ba] focus-within:outline-offset-[-2px] ${
                          isActive
                            ? 'bg-[#0778ba] text-white'
                            : 'bg-white text-[rgba(0,0,0,0.6)] hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method}
                          checked={isActive}
                          onChange={() => setValue('paymentMethod', method, { shouldValidate: false })}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    )
                  })}
                </div>

                {/* OR divider + card fields — hidden when Apple/Google Pay selected */}
                {!isAltPay && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-[#e4e4e7]" />
                      <span className="text-xs font-medium text-[rgba(0,0,0,0.45)]">OR</span>
                      <div className="flex-1 h-px bg-[#e4e4e7]" />
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="cardNumber" className="text-sm font-medium text-[#09090b] leading-5">
                          Card number <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                        </label>
                        <input
                          id="cardNumber"
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          placeholder="0000 0000 0000 0000"
                          {...register('cardNumber')}
                          onChange={handleCardInput}
                          className={`${inputBase} ${errors.cardNumber ? inputErrorCls : ''}`}
                          aria-invalid={!!errors.cardNumber}
                    aria-describedby={errors.cardNumber ? "cardNumber-error" : undefined}
                    aria-required="true"
                        />
                        <FieldError id="cardNumber-error" message={errors.cardNumber?.message} />
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <label htmlFor="expiration" className="text-sm font-medium text-[#09090b] leading-5">
                            Expiration <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                          </label>
                          <input
                            id="expiration"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            placeholder="MM/YY"
                            {...register('expiration')}
                            onChange={handleExpInput}
                            className={`${inputBase} ${errors.expiration ? inputErrorCls : ''}`}
                            aria-invalid={!!errors.expiration}
                    aria-describedby={errors.expiration ? "expiration-error" : undefined}
                    aria-required="true"
                          />
                          <FieldError id="expiration-error" message={errors.expiration?.message} />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <label htmlFor="security" className="text-sm font-medium text-[#09090b] leading-5">
                            Security code <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                          </label>
                          <input
                            id="security"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            placeholder="CVV"
                            maxLength={4}
                            {...register('security')}
                            className={`${inputBase} ${errors.security ? inputErrorCls : ''}`}
                            aria-invalid={!!errors.security}
                    aria-describedby={errors.security ? "security-error" : undefined}
                    aria-required="true"
                          />
                          <FieldError id="security-error" message={errors.security?.message} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="cardName" className="text-sm font-medium text-[#09090b] leading-5">
                          Cardholder name <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                        </label>
                        <input
                          id="cardName"
                          type="text"
                          autoComplete="cc-name"
                          {...register('cardName')}
                          className={`${inputBase} ${errors.cardName ? inputErrorCls : ''}`}
                          aria-invalid={!!errors.cardName}
                    aria-describedby={errors.cardName ? "cardName-error" : undefined}
                    aria-required="true"
                        />
                        <FieldError id="cardName-error" message={errors.cardName?.message} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* BILLING ADDRESS — hidden when Apple/Google Pay selected */}
              {!isAltPay && (
                <div className="flex flex-col gap-4">
                  <SectionHeader label="Billing Address" />

                  <div className="flex gap-3 items-start">
                    <div className="flex items-center justify-center h-5 w-4 shrink-0 mt-0.5">
                      <input
                        id="sameAsDelivery"
                        type="checkbox"
                        {...register('sameAsDelivery')}
                        className="size-4 rounded border-[#e4e4e7] accent-[#0778ba] focus-visible:ring-2 focus-visible:ring-[#0778ba] cursor-pointer"
                      />
                    </div>
                    <label htmlFor="sameAsDelivery" className="text-sm font-medium text-[#09090b] leading-5 cursor-pointer">
                      Same as delivery address
                    </label>
                  </div>

                  {!sameAsDelivery && (
                    <div className="flex flex-col gap-4 animate-[fadeIn_0.3s_ease_forwards]">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="billingStreet" className="text-sm font-medium text-[#09090b] leading-5">
                          Street address <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                        </label>
                        <input
                          id="billingStreet"
                          type="text"
                          autoComplete="billing address-line1"
                          {...register('billingStreet')}
                          className={`${inputBase} ${errors.billingStreet ? inputErrorCls : ''}`}
                          aria-invalid={!!errors.billingStreet}
                    aria-describedby={errors.billingStreet ? "billingStreet-error" : undefined}
                    aria-required="true"
                        />
                        <FieldError id="billingStreet-error" message={errors.billingStreet?.message} />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="billingApt" className="text-sm font-medium text-[#09090b] leading-5">
                          Apt, suite, etc.
                        </label>
                        <input
                          id="billingApt"
                          type="text"
                          autoComplete="billing address-line2"
                          {...register('billingApt')}
                          className={inputBase}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="billingCity" className="text-sm font-medium text-[#09090b] leading-5">
                          City <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                        </label>
                        <input
                          id="billingCity"
                          type="text"
                          autoComplete="billing address-level2"
                          {...register('billingCity')}
                          className={`${inputBase} ${errors.billingCity ? inputErrorCls : ''}`}
                          aria-invalid={!!errors.billingCity}
                    aria-describedby={errors.billingCity ? "billingCity-error" : undefined}
                    aria-required="true"
                        />
                        <FieldError id="billingCity-error" message={errors.billingCity?.message} />
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <label htmlFor="billingState" className="text-sm font-medium text-[#09090b] leading-5">
                            State <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                          </label>
                          <div className="relative">
                            <select
                              id="billingState"
                              {...register('billingState')}
                              defaultValue=""
                              className={`${inputBase} appearance-none pr-8 ${errors.billingState ? inputErrorCls : ''}`}
                              aria-invalid={!!errors.billingState}
                    aria-describedby={errors.billingState ? "billingState-error" : undefined}
                    aria-required="true"
                            >
                              <option value="" disabled>Select a state</option>
                              {US_STATES.map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                              <ChevronUpDownIcon />
                            </span>
                          </div>
                          <FieldError id="billingState-error" message={errors.billingState?.message} />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <label htmlFor="billingZip" className="text-sm font-medium text-[#09090b] leading-5">
                            ZIP code <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                          </label>
                          <input
                            id="billingZip"
                            type="text"
                            inputMode="numeric"
                            autoComplete="billing postal-code"
                            maxLength={5}
                            {...register('billingZip')}
                            className={`${inputBase} ${errors.billingZip ? inputErrorCls : ''}`}
                            aria-invalid={!!errors.billingZip}
                    aria-describedby={errors.billingZip ? "billingZip-error" : undefined}
                    aria-required="true"
                          />
                          <FieldError id="billingZip-error" message={errors.billingZip?.message} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Authorization text + trust badges — keep 24px between them */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  {isConsultation ? (
                    <>
                      <p className="text-sm font-medium text-[rgba(0,0,0,0.6)] leading-5">
                        By securing your appointment, you authorize $35 today to schedule your live consultation.
                      </p>
                      <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5">
                        This fee is non-refundable if you cancel within 24 hours of your scheduled appointment.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-[rgba(0,0,0,0.6)] leading-5">
                        By submitting, you authorize ${dueToday.toLocaleString()} today. If your prescription is approved, you will be charged according to the plan and billing cycle you selected until you cancel.
                      </p>
                      <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5">
                        Payment does not guarantee a prescription. If treatment is not approved, you will receive a refund.
                      </p>
                    </>
                  )}
                </div>

                {/* Trust badges — same 1x display dimensions as /get-started */}
                <div className="flex items-center justify-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BADGE_HIPAA} alt="HIPAA Compliant" className="object-contain shrink-0" style={{ width: 46, height: 54 }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BADGE_SSL} alt="SSL Secure" className="object-contain shrink-0" style={{ width: 48, height: 48 }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BADGE_LEGIT} alt="LegitScript Certified" className="object-contain shrink-0" style={{ width: 50, height: 54 }} />
                </div>
              </div>

            </form>
          )}
        </div>
      </main>

      {/* ── Sticky CTA ── */}
      <div
        ref={stickyCtaRef}
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-12 pt-4"
        style={{
          background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))',
          opacity: done ? 1 : 0,
          pointerEvents: done ? 'auto' : 'none',
          transition: 'opacity 0.5s',
        }}
      >
        <div className="w-full md:w-[480px] flex flex-col">

          {/* Submit request button */}
          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting}
            className="
              w-full h-[42px] flex items-center justify-center gap-3 px-4
              rounded-tl-[36px]
              text-white text-base font-medium leading-6 whitespace-nowrap
              transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
              shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
            "
            style={{
              background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)',
            }}
          >
            {isSubmitting ? 'Submitting…' : isConsultation ? 'Secure appointment' : 'Submit request'}
          </button>

          {/* Cart bar */}
          <div
            className="flex items-center justify-center gap-4 px-4 py-3 rounded-br-[36px] overflow-x-auto"
            style={{ background: 'rgba(29,45,68,0.95)', backdropFilter: 'blur(2px)' }}
          >
            {/* Left: consultation schedule OR medication badges */}
            {isConsultation && consultationDetails ? (
              <div className="flex flex-col gap-1.5 items-center justify-center shrink-0">
                <div className="flex items-center gap-2">
                  {consultationDetails.format === 'Video' ? <VideoCallIcon /> : <PhoneCallIcon />}
                  <span className="text-sm font-medium text-white">
                    {consultationDetails.format === 'Video' ? 'Video Call' : 'Phone Call'}
                  </span>
                </div>
                <span
                  className="text-[12px] font-normal leading-4 text-[rgba(255,255,255,0.7)] border rounded-xl whitespace-nowrap"
                  style={{
                    background: 'rgba(244,244,245,0.08)',
                    borderColor: 'rgba(244,244,245,0.12)',
                    padding: '4px 6px',
                  }}
                >
                  {consultationDetails.dateLabel} @ {consultationDetails.time}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1 items-start justify-center shrink-0">
                {cartItems.length > 0
                  ? cartItems.map((item, i) => (
                      <span
                        key={i}
                        className="text-[12px] font-normal leading-4 text-[rgba(255,255,255,0.7)] border rounded-xl whitespace-nowrap"
                        style={{
                          background: 'rgba(244,244,245,0.08)',
                          borderColor: 'rgba(244,244,245,0.12)',
                          padding: '4px 6px',
                        }}
                      >
                        {item}
                      </span>
                    ))
                  : (
                    <span className="text-[12px] text-white/40">No items selected</span>
                  )
                }
              </div>
            )}

            {/* Vertical divider */}
            <div className="w-px self-stretch bg-[rgba(255,255,255,0.1)] shrink-0" />

            {/* Due Today */}
            <div className="flex flex-col items-start shrink-0">
              <span className="text-[12px] font-light text-white tracking-[1.5px] uppercase leading-4">
                Due Today
              </span>
              <span className="text-[24px] font-normal text-white leading-8 tracking-[-0.6px]">
                ${dueToday.toLocaleString()}
              </span>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
