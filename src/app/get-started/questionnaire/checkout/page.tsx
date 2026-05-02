'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import type { StripeCardNumberElementOptions } from '@stripe/stripe-js'
import BackHeader from '@/components/ui/BackHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { US_STATES } from '@/lib/us-states'
import {
  getPriorSteps,
  getStepValues,
  saveStep,
  buildIntakeData,
} from '@/lib/intake-session-store'
import { defaultIntakeData, type IntakeData } from '@/lib/intake-flow'
import { submitIntake, type BookedSlot } from '@/lib/supabase/submit-intake'
import { getSessionToken } from '@/lib/supabase/intake-session'
import { useEveTyping } from '@/lib/useEveTyping'
import { getStripeBrowser } from '@/lib/stripe/client-side'
import { usePricingCatalog, lookupPriceCents } from '@/lib/pricing/usePricingCatalog'

// Maps the questionnaire-level treatment ID to the canonical catalog slug.
// 'glp-1' splits into semaglutide / tirzepatide based on the patient's
// type choice; other IDs map 1:1.
function resolveCatalogSlug(treatmentId: string, choiceType: unknown): string {
  if (treatmentId === 'glp-1') {
    return choiceType === 'tirzepatide' ? 'tirzepatide' : 'semaglutide'
  }
  return treatmentId
}

// Module-level stripe promise so we don't reload Stripe.js on every render.
const stripePromise = getStripeBrowser()

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

// Card data is collected by Stripe Elements (CardNumberElement/Expiry/Cvc)
// in iframes, validated by Stripe client-side, and never enters our form
// state — so the schema only validates non-card fields. Cardholder name
// is metadata (passed as billing_details.name to Stripe), not card data.
const checkoutSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit US phone number'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  street: z.string().min(1, 'Street address is required'),
  apt: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  deliveryState: z.string().min(1, 'State is required'),
  zip: z.string().regex(/^\d{5}$/, 'Enter a valid 5-digit ZIP code'),
  paymentMethod: z.enum(['card', 'pay']),
  cardName: z.string().optional(),
  sameAsDelivery: z.boolean(),
  billingStreet: z.string().optional(),
  billingApt: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  telehealthConsent: z.boolean().refine((val) => val === true, {
    message: 'You must consent to receive telehealth services to continue',
  }),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'card') {
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
  'focus:outline-none focus:border-[#3A5190] focus-within:border-[#3A5190] transition-colors'

const inputErrorCls = 'border-red-600 focus:border-red-600 focus-within:border-red-600'

// Stripe Elements styling — tuned to visually match `inputBase` so the
// iframed Stripe inputs blend with the surrounding native inputs.
// Stripe doesn't accept Tailwind class names; we have to provide raw CSS
// values to its `style` option.
//
// NOTE: `showIcon` is only valid on CardNumberElement, not Expiry/Cvc.
// CardNumberElement shows the card brand icon by default, so we don't
// need to pass it explicitly. We share a single options object across
// all three Stripe Elements to avoid drift.
const STRIPE_ELEMENT_OPTIONS: StripeCardNumberElementOptions = {
  style: {
    base: {
      fontSize:    '16px',
      color:       'rgba(0, 0, 0, 0.87)',
      fontFamily:  'system-ui, -apple-system, sans-serif',
      '::placeholder': {
        color: '#71717a',
      },
    },
    invalid: {
      color:    '#dc2626',  // tailwind red-600
      iconColor:'#dc2626',
    },
  },
}

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

// Plan prices come from /api/treatments/pricing via usePricingCatalog().
// No hardcoded amounts here — see resolveCatalogSlug + lookupPriceCents below.

// ─── Slot-hold helpers ───────────────────────────────────────────────────────

const BOOK_CONSULTATION_ROUTE = '/get-started/questionnaire/book-consultation'

/** Reconstruct the BookedSlot payload that /book-consultation stashed
 *  in step 13. Returns null if any required field is missing. */
function readBookedSlot(): BookedSlot | null {
  const s13 = getStepValues(13)
  const required = ['holdId','providerId','healthieUserId','slotDatetime','contactType','providerName','expiresAt'] as const
  for (const k of required) {
    if (typeof s13[k] !== 'string' || !s13[k]) return null
  }
  const ct = String(s13.contactType)
  if (ct !== 'video' && ct !== 'phone') return null
  return {
    holdId:         String(s13.holdId),
    providerId:     String(s13.providerId),
    healthieUserId: String(s13.healthieUserId),
    slotDatetime:   String(s13.slotDatetime),
    contactType:    ct,
    providerName:   String(s13.providerName),
    expiresAt:      String(s13.expiresAt),
  }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 90

// ─── Page ────────────────────────────────────────────────────────────────────

// The page is wrapped in <Elements> at the bottom; this inner component
// is where the actual UI lives so it can use useStripe / useElements hooks.
function CheckoutPageInner() {
  const router = useRouter()
  const [dueToday, setDueToday] = useState(0)
  const [cartItems, setCartItems] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)
  const [isAndroid, setIsAndroid] = useState(false)

  // Live price catalog from /api/treatments/pricing — replaces any
  // hardcoded PLAN_PRICES. While loading, async cart total renders as
  // $0 momentarily, then reconciles when the catalog arrives.
  const { catalog: pricingCatalog } = usePricingCatalog()

  // The sticky CTA + cart grows with the number of treatments. Measure it so
  // the main scroll region always has enough bottom padding to clear it.
  const stickyCtaRef = useRef<HTMLDivElement>(null)
  const [stickyCtaHeight, setStickyCtaHeight] = useState(144)

  // Detect consultation flow synchronously so backHref and CTA are correct immediately.
  // Consult flow saves consultation details (incl. `format`) at step 13;
  // async flow saves medication choices at step 13 (no `format`), so the
  // presence of `format` is the unambiguous signal.
  const [isConsultation] = useState(() => {
    const s13 = getStepValues(13)
    return typeof s13.format === 'string' && !!s13.format
  })
  const [consultationDetails, setConsultationDetails] = useState<{
    format: 'Video' | 'Phone'
    dateLabel: string
    time: string
  } | null>(null)

  // Slot hold countdown — only populated when /book-consultation reserved
  // a real slot (commit 3 onwards). Legacy intakes that came through the
  // mock picker will have isConsultation=true but no holdId; the banner
  // simply doesn't render in that case.
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null)
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState<number>(0)
  const [holdExpired, setHoldExpired] = useState(false)

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

  // ── Hold validation + countdown ─────────────────────────────────────
  // On mount, ask the server about the hold we created at /book-consultation.
  // Three outcomes:
  //   - Hold valid → set expiresAt, countdown ticks every second.
  //   - Hold expired (410) → flash the expired banner, redirect to /book-consultation.
  //   - Hold not found / no holdId saved → quietly skip; legacy paths are
  //     still allowed to submit without a hold.
  useEffect(() => {
    if (!isConsultation) return
    const slot = readBookedSlot()
    if (!slot) return
    let cancelled = false

    fetch(`/api/availability/reserve/${slot.holdId}`, {
      headers: { 'x-session-token': getSessionToken() },
      cache:   'no-store',
    })
      .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }))
      .then(({ status, body }) => {
        if (cancelled) return
        if (status === 410 || body?.expired) {
          setHoldExpired(true)
          // Best-effort release; cleanup-holds cron will sweep regardless.
          fetch(`/api/availability/reserve/${slot.holdId}`, {
            method: 'DELETE',
            headers: { 'x-session-token': getSessionToken() },
          }).catch(() => {})
          setTimeout(() => router.push(BOOK_CONSULTATION_ROUTE), 2000)
          return
        }
        if (!body?.ok || !body?.expiresAt) {
          // Hold isn't ours or doesn't exist — punt back to the picker.
          router.push(BOOK_CONSULTATION_ROUTE)
          return
        }
        setHoldExpiresAt(body.expiresAt)
      })
      .catch(() => { /* network blip; rely on countdown to catch true expiry */ })

    return () => { cancelled = true }
  }, [isConsultation, router])

  // 1-second tick. When countdown hits 0, release the hold and bounce.
  useEffect(() => {
    if (!holdExpiresAt || holdExpired) return
    const tick = () => {
      const ms = new Date(holdExpiresAt).getTime() - Date.now()
      const sec = Math.max(0, Math.floor(ms / 1000))
      setHoldSecondsRemaining(sec)
      if (sec === 0) {
        setHoldExpired(true)
        const slot = readBookedSlot()
        if (slot) {
          fetch(`/api/availability/reserve/${slot.holdId}`, {
            method: 'DELETE',
            headers: { 'x-session-token': getSessionToken() },
          }).catch(() => {})
        }
        setTimeout(() => router.push(BOOK_CONSULTATION_ROUTE), 2000)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [holdExpiresAt, holdExpired, router])

  useEffect(() => {
    setIsAndroid(/android/i.test(navigator.userAgent))

    const prior = getPriorSteps(14)
    const last = prior[prior.length - 1]
    if (last && Array.isArray(last.bubbles)) {
      setCurrentStep({
        ...last,
        editHref: isConsultation
          ? '/get-started/questionnaire/book-consultation'
          : '/get-started/questionnaire/choose-medications',
      })
    }

    const step12 = getStepValues(12)
    const step13 = getStepValues(13)

    if (isConsultation) {
      // Sync visit fee comes from the catalog (services.sync_visit). While
      // the catalog is loading, dueToday stays 0; the useEffect re-runs
      // when pricingCatalog populates and reconciles to the real value.
      const syncCents = pricingCatalog?.services?.sync_visit?.amount_cents ?? 0
      setDueToday(Math.round(syncCents / 100))
      const fmt = (typeof step13.format === 'string' ? step13.format : 'Video') as 'Video' | 'Phone'
      const dateLabel = typeof step13.date === 'string' ? formatConsultDate(step13.date) : ''
      const time = typeof step13.time === 'string' ? step13.time : ''
      setConsultationDetails({ format: fmt, dateLabel, time })
    } else {
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

      let totalCents = 0
      const items: string[] = []
      treatments.forEach(id => {
        const c = choices[id]
        const plan = c?.plan
        if (plan && c?.form) {
          const slug = resolveCatalogSlug(id, c.type)
          const cents = lookupPriceCents(pricingCatalog, slug, c.form, plan)
          if (cents != null) totalCents += cents
        }
        const name = id === 'glp-1' && c?.type
          ? (c.type === 'semaglutide' ? 'Semaglutide' : 'Tirzepatide')
          : (TREATMENT_NAMES[id] ?? id)
        const form = c?.form === 'injection' ? 'Injections' : c?.form === 'oral' ? 'Oral Tablets' : null
        const planLabel = plan ? plan.replace('mo', ' mo') : null
        if (form && planLabel) items.push(`${name} ${form} (${planLabel})`)
      })
      setDueToday(Math.round(totalCents / 100))
      setCartItems(items)
    }
    // Re-run when the pricing catalog loads so the async total reflects
    // real prices instead of $0.
  }, [pricingCatalog])

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
      telehealthConsent: false,
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

  // Stripe Elements state — controlled outside RHF since card data
  // lives in cross-origin iframes managed by Stripe.
  const stripe = useStripe()
  const elements = useElements()
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState({
    number: false,
    expiry: false,
    cvc: false,
  })

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

    // Use the canonical helper — fixes a long-standing cookie-name mismatch
    // (this page was reading 'intake_session=' but the cookie is actually
    // 'pmd_intake_session'). getSessionToken returns the same value the
    // /book-consultation page used to reserve the hold, so the worker sees
    // a consistent thread.
    const sessionToken = getSessionToken()
    const bookedSlot = readBookedSlot() ?? undefined

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
      bookedSlot,
    )

    if (!result.success) {
      // Non-blocking: if the backend submit fails (network, server error),
      // we still route to confirmation so the patient sees the success
      // screen. The intake exists in sessionStorage and ops can recover.
      // We log so this is visible in Sentry / browser logs later.
      console.error('Intake submission failed:', result.error)
      router.push('/get-started/confirmation')
      return
    }

    // ── Determine which Stripe flow to run ──
    // - isConsultation (booked sync visit) → sync_visit mode ($35 visit fee)
    // - cart has items                     → async_subscription mode
    // - neither                            → no payment, just go to confirmation
    //
    // We gate on isConsultation rather than result.visitType because
    // /api/intake derives visit_type from STATE not from the patient's
    // actual choice; isConsultation comes from the bookedSlot data and
    // is the correct signal.
    if ((isConsultation || cartItems.length > 0) && result.submissionId && result.patientId) {
      if (!stripe || !elements) {
        setStripeError('Payment system is still loading. Please try again in a moment.')
        return
      }
      const cardNumber = elements.getElement(CardNumberElement)
      if (!cardNumber) {
        setStripeError('Card form did not initialize. Please refresh and try again.')
        return
      }

      // 1) Create the server-side intent (PaymentIntent for sync,
      //    Subscription-with-clientSecret for async).
      let clientSecret: string | null = null
      try {
        const requestBody = isConsultation
          ? {
              mode:         'sync_visit',
              submissionId: result.submissionId,
              patientId:    result.patientId,
            }
          : {
              mode:         'async_subscription',
              submissionId: result.submissionId,
              patientId:    result.patientId,
              cart:         buildAsyncCartPayload(),
            }

        const intentRes = await fetch('/api/checkout/session', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(requestBody),
        })
        const intentBody = await intentRes.json()
        if (!intentRes.ok || !intentBody.clientSecret) {
          console.error('Stripe checkout session failed:', intentBody?.error)
          setStripeError(intentBody?.error || 'Could not start payment. Please try again.')
          return
        }
        clientSecret = intentBody.clientSecret
      } catch (err) {
        console.error('Stripe checkout session network error:', err)
        setStripeError('Network error. Please check your connection and try again.')
        return
      }

      // 2) Confirm the PaymentIntent with card data from Stripe Elements.
      //    Same call shape for both sync (one-time) and async (subscription's
      //    first invoice) — Stripe handles the underlying difference.
      const billingAddress = data.sameAsDelivery
        ? {
            line1:       data.street,
            line2:       data.apt || undefined,
            city:        data.city,
            state:       data.deliveryState,
            postal_code: data.zip,
            country:     'US',
          }
        : {
            line1:       data.billingStreet || data.street,
            line2:       data.billingApt    || undefined,
            city:        data.billingCity   || data.city,
            state:       data.billingState  || data.deliveryState,
            postal_code: data.billingZip    || data.zip,
            country:     'US',
          }

      const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret!,
        {
          payment_method: {
            card: cardNumber,
            billing_details: {
              name:    data.cardName || `${intakeData.firstName} ${intakeData.lastName}`.trim(),
              email:   data.email,
              phone:   data.phone,
              address: billingAddress,
            },
          },
        },
      )

      if (confirmErr) {
        setStripeError(confirmErr.message ?? 'Payment failed. Please try a different card.')
        return
      }
      if (paymentIntent?.status !== 'succeeded') {
        setStripeError('Payment did not complete. Please try again or contact support.')
        return
      }

      // Success — webhook reconciles payments + subscriptions rows. Navigate.
    }

    router.push('/get-started/confirmation')
  }

  /**
   * Reads the async cart out of sessionStorage (steps 12 + 13) and shapes
   * it for the /api/checkout/session async_subscription payload.
   * Server resolves catalog_slug + price_id from these fields.
   */
  function buildAsyncCartPayload(): Array<{
    treatment_id: string
    type?:        string
    formulation:  string
    term:         string
  }> {
    const step12 = getStepValues(12)
    const step13 = getStepValues(13)
    let treatmentIds: string[] = []
    if (typeof step12.treatments === 'string') {
      try { treatmentIds = JSON.parse(step12.treatments) } catch { /* ignore */ }
    }
    let choices: Record<string, { type?: string; form?: string; plan?: string }> = {}
    if (typeof step13.choices === 'string') {
      try { choices = JSON.parse(step13.choices) } catch { /* ignore */ }
    }
    const cart: Array<{ treatment_id: string; type?: string; formulation: string; term: string }> = []
    for (const id of treatmentIds) {
      const c = choices[id]
      if (!c?.form || !c?.plan) continue
      cart.push({
        treatment_id: id,
        type:         c.type,
        formulation:  c.form,
        term:         c.plan,
      })
    }
    return cart
  }

  return (
    <>
      <BackHeader
        backHref={isConsultation
          ? '/get-started/questionnaire/desired-treatments'
          : '/get-started/questionnaire/choose-medications'}
        progress={PROGRESS}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto bg-white focus:outline-none pb-[calc(var(--cta-h)-8px)] [scroll-padding-bottom:calc(var(--cta-h)-8px)] md:pb-[calc(var(--cta-h)+32px)] md:[scroll-padding-bottom:calc(var(--cta-h)+32px)]"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          ['--cta-h' as string]: `${stickyCtaHeight}px`,
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 pt-6 md:pt-9">

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
              {done && isConsultation && holdExpiresAt && !holdExpired && (
                <p
                  className="text-sm font-bold text-[rgba(0,0,0,0.6)] leading-5"
                  role="status"
                  aria-live="polite"
                >
                  I&rsquo;ll hold your selected schedule for{' '}
                  {formatCountdown(holdSecondsRemaining)}
                </p>
              )}
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

                <p className="text-sm font-bold leading-5 text-[#3A5190]">
                  To get updates about your care and sign in to your Care Portal, make sure you have access to your mobile number or email.
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
                        className={`flex-1 h-10 flex items-center justify-center cursor-pointer text-sm font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-[#3A5190] focus-within:outline-offset-[-2px] ${
                          isActive
                            ? 'bg-[#3A5190] text-white'
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
                      {/* Stripe Elements — card data is iframed by Stripe so it never
                          touches our servers (PCI scope stays SAQ-A). The styling is
                          tuned to match the existing native input look (height 42px,
                          border radius 8px, etc.) via the StripeElement options below. */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="cardNumber" className="text-sm font-medium text-[#09090b] leading-5">
                          Card number <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                        </label>
                        <div
                          id="cardNumber"
                          className={`${inputBase} flex items-center ${stripeError ? inputErrorCls : ''}`}
                        >
                          <CardNumberElement
                            options={STRIPE_ELEMENT_OPTIONS}
                            onChange={(e) => {
                              setCardComplete((prev) => ({ ...prev, number: e.complete }))
                              if (e.error) setStripeError(e.error.message)
                              else setStripeError(null)
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <label htmlFor="expiration" className="text-sm font-medium text-[#09090b] leading-5">
                            Expiration <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                          </label>
                          <div id="expiration" className={`${inputBase} flex items-center`}>
                            <CardExpiryElement
                              options={STRIPE_ELEMENT_OPTIONS}
                              onChange={(e) => setCardComplete((prev) => ({ ...prev, expiry: e.complete }))}
                              className="w-full"
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <label htmlFor="security" className="text-sm font-medium text-[#09090b] leading-5">
                            Security code <span className="text-red-600" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                          </label>
                          <div id="security" className={`${inputBase} flex items-center`}>
                            <CardCvcElement
                              options={STRIPE_ELEMENT_OPTIONS}
                              onChange={(e) => setCardComplete((prev) => ({ ...prev, cvc: e.complete }))}
                              className="w-full"
                            />
                          </div>
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

                      {/* Stripe error surface — displays card decline or 3DS failures
                          inline so the patient gets actionable feedback without
                          leaving the page. */}
                      {stripeError && (
                        <p className="text-xs text-red-600 leading-4 mt-1" role="alert">
                          {stripeError}
                        </p>
                      )}
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
                        className="size-4 rounded border-[#e4e4e7] accent-[#3A5190] focus-visible:ring-2 focus-visible:ring-[#3b82f6] cursor-pointer"
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

              {/* Authorization text + telehealth consent + trust badges — 24px between groups */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  {isConsultation ? (
                    <>
                      <p className="text-sm font-medium text-[rgba(0,0,0,0.6)] leading-5">
                        By securing your appointment, you authorize ${dueToday.toLocaleString()} today to schedule your live consultation.
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

                {/* Telehealth informed consent — required */}
                <div className="flex flex-col gap-1">
                  <div className="flex gap-3 items-start">
                    <div className="flex items-center justify-center h-5 w-4 shrink-0">
                      <input
                        id="telehealthConsent"
                        type="checkbox"
                        {...register('telehealthConsent')}
                        className="size-4 rounded border-[#e4e4e7] accent-[#3A5190] focus-visible:ring-2 focus-visible:ring-[#3b82f6] cursor-pointer"
                        aria-invalid={!!errors.telehealthConsent}
                        aria-describedby={errors.telehealthConsent ? 'telehealthConsent-error' : undefined}
                        aria-required="true"
                      />
                    </div>
                    <label
                      htmlFor="telehealthConsent"
                      className="flex-1 text-sm font-medium leading-5 text-[rgba(0,0,0,0.87)] cursor-pointer"
                    >
                      I have read the{' '}
                      <a
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3A5190] underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Telehealth Informed Consent
                      </a>{' '}
                      and consent to receive telehealth services.{' '}
                      <span className="text-red-600" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </label>
                  </div>
                  <FieldError id="telehealthConsent-error" message={errors.telehealthConsent?.message} />
                </div>

                {/* Trust badges — same 1x display dimensions as /get-started */}
                <div className="flex items-center justify-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BADGE_LEGIT} alt="LegitScript Certified" className="object-contain shrink-0" style={{ width: 50, height: 54 }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BADGE_HIPAA} alt="HIPAA Compliant" className="object-contain shrink-0" style={{ width: 46, height: 54 }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BADGE_SSL} alt="SSL Secure" className="object-contain shrink-0" style={{ width: 48, height: 48 }} />
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
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
            "
            style={{
              background: 'linear-gradient(90deg, #3A5190 0%, #3A5190 64.61%, #A2D5BC 100%)',
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

// Public default export — wraps the inner component in Stripe's <Elements>
// provider so CardNumberElement / CardExpiryElement / CardCvcElement can
// be used inside. The wrapper is purely structural; all logic lives in
// CheckoutPageInner above.
export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutPageInner />
    </Elements>
  )
}
