'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { US_STATES } from '@/lib/us-states'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'

const QUESTION_TEXT = 'Finally, some last few details to process your request.'

// ─── Assets ──────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'
const BADGE_HIPAA = '/assets/badge-hipaa.png'
const BADGE_SSL = '/assets/badge-ssl.png'
const BADGE_LEGIT = '/assets/badge-legit.png'

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
  }
  if (!data.sameAsDelivery) {
    if (!data.billingStreet?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Street address is required', path: ['billingStreet'] })
    if (!data.billingCity?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'City is required', path: ['billingCity'] })
    if (!data.billingState) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'State is required', path: ['billingState'] })
    if (!data.billingZip || !/^\d{5}$/.test(data.billingZip)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid ZIP', path: ['billingZip'] })
  }
})

type FormValues = z.infer<typeof checkoutSchema>

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputBase =
  'w-full h-[42px] px-3 py-1.5 bg-white border border-[#e4e4e7] rounded-lg shadow-sm ' +
  'text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0778ba] focus:border-[#0778ba] transition-colors'

const inputErrorCls = 'border-red-400 focus:ring-red-400 focus:border-red-400'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-500 leading-4 mt-1" role="alert">{message}</p>
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold tracking-widest uppercase text-[rgba(0,0,0,0.45)] shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#e4e4e7]" />
    </div>
  )
}

// ─── Plan prices ─────────────────────────────────────────────────────────────

const PLAN_PRICES: Record<string, number> = { '1mo': 149, '3mo': 417, '6mo': 774, '12mo': 1188 }

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 90

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [dueToday, setDueToday] = useState(0)
  const [cartItems, setCartItems] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)

  useEffect(() => {
    const step0 = getStepValues(0)
    if (typeof step0.phone === 'string') setPhone(step0.phone)

    const prior = getPriorSteps(14)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({
        ...last,
        editHref: '/get-started/questionnaire/choose-medications',
      })
    }

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

    const TREATMENT_NAMES: Record<string, string> = {
      'ghk-cu': 'GHK-Cu', 'glp-1': 'GLP-1', 'glutathione': 'Glutathione',
      'nad-plus': 'NAD+', 'sermorelin': 'Sermorelin',
    }

    let total = 0
    const items: string[] = []
    treatments.forEach(id => {
      const c = choices[id]
      const plan = c?.plan
      if (plan) total += PLAN_PRICES[plan] ?? 0
      let name = id === 'glp-1' && c?.type
        ? (c.type === 'semaglutide' ? 'Semaglutide' : 'Tirzepatide')
        : (TREATMENT_NAMES[id] ?? id)
      const form = c?.form === 'injection' ? 'Injections' : c?.form === 'oral' ? 'Oral Tablets' : null
      const planLabel = plan ? plan.replace('mo', ' mo') : null
      if (form && planLabel) items.push(`${name} ${form} (${planLabel})`)
    })
    setDueToday(total)
    setCartItems(items)
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
      paymentMethod: 'card',
      sameAsDelivery: true,
    },
  })

  const paymentMethod = watch('paymentMethod')
  const sameAsDelivery = watch('sameAsDelivery')

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

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
    router.push('/get-started/request-submitted')
  }

  return (
    <>
      <IntakeHeader backHref="/get-started/questionnaire/choose-medications" progress={PROGRESS} />

      <main
        className="overflow-y-auto bg-white"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: '7rem',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

          <ChatHistory
            historicSteps={[]}
            currentStep={currentStep}
            animateCurrentStep={animateBubbles}
          />

          {/* ── Eve's message ── */}
          <div id="main-content" tabIndex={-1} className="flex items-start gap-3 w-full focus:outline-none">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <p
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
              </p>
            </div>
          </div>

          {/* ── Form ── */}
          {done && (
          <form
            id="checkout-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease_forwards]"
          >

            {/* ACCOUNT DETAILS */}
            <div className="flex flex-col gap-4">
              <SectionHeader label="Account Details" />

              {/* Phone — read-only */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#09090b] leading-5">
                  Mobile number
                </label>
                <div className={`${inputBase} flex items-center gap-0 !px-0 overflow-hidden opacity-70`}>
                  <span className="px-3 text-sm text-[#09090b] opacity-50 shrink-0">+1</span>
                  <span className="flex-1 py-1.5 pr-3 text-base text-[rgba(0,0,0,0.87)]">{phone}</span>
                </div>
                <p className="text-xs font-semibold text-[#0778ba] leading-4">
                  Will be used to sign in to your Care Portal
                </p>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium text-[#09090b] leading-5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`${inputBase} ${errors.email ? inputErrorCls : ''}`}
                  aria-invalid={!!errors.email}
                />
                <FieldError message={errors.email?.message} />
              </div>
            </div>

            {/* DELIVERY ADDRESS */}
            <div className="flex flex-col gap-4">
              <SectionHeader label="Delivery Address" />

              <div className="flex flex-col gap-2">
                <label htmlFor="street" className="text-sm font-medium text-[#09090b] leading-5">
                  Street address <span className="text-red-500">*</span>
                </label>
                <input
                  id="street"
                  type="text"
                  autoComplete="address-line1"
                  {...register('street')}
                  className={`${inputBase} ${errors.street ? inputErrorCls : ''}`}
                  aria-invalid={!!errors.street}
                />
                <FieldError message={errors.street?.message} />
              </div>

              <div className="flex flex-col gap-2">
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

              <div className="flex flex-col gap-2">
                <label htmlFor="city" className="text-sm font-medium text-[#09090b] leading-5">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  id="city"
                  type="text"
                  autoComplete="address-level2"
                  {...register('city')}
                  className={`${inputBase} ${errors.city ? inputErrorCls : ''}`}
                  aria-invalid={!!errors.city}
                />
                <FieldError message={errors.city?.message} />
              </div>

              <div className="flex gap-3 items-start">
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <label htmlFor="deliveryState" className="text-sm font-medium text-[#09090b] leading-5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="deliveryState"
                      {...register('deliveryState')}
                      defaultValue=""
                      className={`${inputBase} appearance-none pr-8 ${errors.deliveryState ? inputErrorCls : ''}`}
                      aria-invalid={!!errors.deliveryState}
                    >
                      <option value="" disabled />
                      {US_STATES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                      <ChevronUpDownIcon />
                    </span>
                  </div>
                  <FieldError message={errors.deliveryState?.message} />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <label htmlFor="zip" className="text-sm font-medium text-[#09090b] leading-5">
                    ZIP code <span className="text-red-500">*</span>
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
                  />
                  <FieldError message={errors.zip?.message} />
                </div>
              </div>
            </div>

            {/* PAYMENT DETAILS */}
            <div className="flex flex-col gap-4">
              <SectionHeader label="Payment Details" />

              {/* Card / Pay toggle */}
              <div className="flex rounded-lg border border-[#e4e4e7] overflow-hidden shadow-sm">
                {(['card', 'pay'] as const).map(method => {
                  const isActive = paymentMethod === method
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setValue('paymentMethod', method, { shouldValidate: false })}
                      className={`flex-1 h-10 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#0778ba] text-white border-2 border-[#0778ba]'
                          : 'bg-white text-[rgba(0,0,0,0.6)] hover:bg-gray-50'
                      }`}
                    >
                      {method === 'card' ? 'Card' : 'Pay'}
                    </button>
                  )
                })}
              </div>

              {paymentMethod === 'card' && (
                <>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="cardNumber" className="text-sm font-medium text-[#09090b] leading-5">
                      Card number <span className="text-red-500">*</span>
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
                    />
                    <FieldError message={errors.cardNumber?.message} />
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <label htmlFor="expiration" className="text-sm font-medium text-[#09090b] leading-5">
                        Expiration <span className="text-red-500">*</span>
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
                      />
                      <FieldError message={errors.expiration?.message} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <label htmlFor="security" className="text-sm font-medium text-[#09090b] leading-5">
                        Security code <span className="text-red-500">*</span>
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
                      />
                      <FieldError message={errors.security?.message} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="cardName" className="text-sm font-medium text-[#09090b] leading-5">
                      Cardholder name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="cardName"
                      type="text"
                      autoComplete="cc-name"
                      {...register('cardName')}
                      className={`${inputBase} ${errors.cardName ? inputErrorCls : ''}`}
                      aria-invalid={!!errors.cardName}
                    />
                    <FieldError message={errors.cardName?.message} />
                  </div>
                </>
              )}
            </div>

            {/* BILLING ADDRESS */}
            <div className="flex flex-col gap-4">
              <SectionHeader label="Billing Address" />

              <div className="flex gap-3 items-start">
                <div className="flex items-center justify-center h-5 w-4 shrink-0 mt-0.5">
                  <input
                    id="sameAsDelivery"
                    type="checkbox"
                    {...register('sameAsDelivery')}
                    className="size-4 rounded border-[#e4e4e7] text-[#0778ba] focus:ring-[#0778ba] cursor-pointer accent-[#0778ba]"
                  />
                </div>
                <label htmlFor="sameAsDelivery" className="text-sm font-medium text-[#09090b] leading-5 cursor-pointer">
                  Same as delivery address
                </label>
              </div>

              {!sameAsDelivery && (
                <div className="flex flex-col gap-4 animate-[fadeIn_0.3s_ease_forwards]">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="billingStreet" className="text-sm font-medium text-[#09090b] leading-5">
                      Street address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="billingStreet"
                      type="text"
                      autoComplete="billing address-line1"
                      {...register('billingStreet')}
                      className={`${inputBase} ${errors.billingStreet ? inputErrorCls : ''}`}
                      aria-invalid={!!errors.billingStreet}
                    />
                    <FieldError message={errors.billingStreet?.message} />
                  </div>

                  <div className="flex flex-col gap-2">
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

                  <div className="flex flex-col gap-2">
                    <label htmlFor="billingCity" className="text-sm font-medium text-[#09090b] leading-5">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="billingCity"
                      type="text"
                      autoComplete="billing address-level2"
                      {...register('billingCity')}
                      className={`${inputBase} ${errors.billingCity ? inputErrorCls : ''}`}
                      aria-invalid={!!errors.billingCity}
                    />
                    <FieldError message={errors.billingCity?.message} />
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <label htmlFor="billingState" className="text-sm font-medium text-[#09090b] leading-5">
                        State <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="billingState"
                          {...register('billingState')}
                          defaultValue=""
                          className={`${inputBase} appearance-none pr-8 ${errors.billingState ? inputErrorCls : ''}`}
                          aria-invalid={!!errors.billingState}
                        >
                          <option value="" disabled />
                          {US_STATES.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                          <ChevronUpDownIcon />
                        </span>
                      </div>
                      <FieldError message={errors.billingState?.message} />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <label htmlFor="billingZip" className="text-sm font-medium text-[#09090b] leading-5">
                        ZIP code <span className="text-red-500">*</span>
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
                      />
                      <FieldError message={errors.billingZip?.message} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Legal / disclaimer */}
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[rgba(0,0,0,0.5)] leading-5">
                By submitting this request, you agree to our{' '}
                <span className="text-[#0778ba]">Terms of Service</span> and{' '}
                <span className="text-[#0778ba]">Privacy Policy</span>. Your information is protected and will only be used to process your request. A licensed provider will review your information before anything is prescribed.
              </p>
              <p className="text-xs text-[rgba(0,0,0,0.45)] leading-5">
                Your card will be charged upon provider approval. If your request is not approved, you will not be charged.
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BADGE_HIPAA} alt="HIPAA Compliant" className="h-8 object-contain" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BADGE_SSL} alt="SSL Secure" className="h-8 object-contain" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BADGE_LEGIT} alt="LegitScript Certified" className="h-8 object-contain" />
            </div>

          </form>
          )}
        </div>
      </main>

      {/* ── Sticky submit footer ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-6 md:pb-12 pt-4"
        style={{ background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))' }}
      >
        <div className="w-full md:w-[480px] flex flex-col gap-2">

          {/* Cart badges */}
          {cartItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cartItems.map((item, i) => (
                <span
                  key={i}
                  className="text-xs bg-[#f4f4f5] rounded-full px-2.5 py-1 text-[rgba(0,0,0,0.6)]"
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting}
            className="
              w-full h-[42px] flex items-center justify-between px-5
              rounded-br-[36px] rounded-tl-[36px]
              text-white text-base font-medium leading-6
              transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
              shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
            "
            style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
          >
            <span>{isSubmitting ? 'Submitting…' : 'Submit request'}</span>
            {dueToday > 0 && (
              <span className="text-sm font-semibold text-white/90">
                DUE TODAY ${dueToday.toLocaleString()}
              </span>
            )}
          </button>

        </div>
      </div>
    </>
  )
}
