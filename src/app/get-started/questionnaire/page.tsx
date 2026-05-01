'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import { US_STATES } from '@/lib/us-states'
import { BLOCKED_STATES_SET } from '@/lib/intake-flow'
import { saveStep, getStepValues } from '@/lib/intake-session-store'
import { usePrefersReducedMotion } from '@/lib/useEveTyping'

// ─── Assets ──────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'

// ─── Phone formatting ─────────────────────────────────────────────────────────

function formatPhone(digits: string): string {
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

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

function FemaleIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"
      className="size-4 shrink-0" aria-hidden="true">
      <circle cx="8" cy="6" r="4.5" stroke={active ? '#3A5190' : '#09090b'} strokeWidth="1.5" />
      <line x1="8" y1="10.5" x2="8" y2="15" stroke={active ? '#3A5190' : '#09090b'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5.5" y1="13" x2="10.5" y2="13" stroke={active ? '#3A5190' : '#09090b'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function MaleIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"
      className="size-4 shrink-0" aria-hidden="true">
      <circle cx="7" cy="9" r="4.5" stroke={active ? '#3A5190' : '#09090b'} strokeWidth="1.5" />
      <line x1="10.5" y1="5.5" x2="15" y2="1" stroke={active ? '#3A5190' : '#09090b'} strokeWidth="1.5" strokeLinecap="round" />
      <polyline points="11,1 15,1 15,5" stroke={active ? '#3A5190' : '#09090b'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}


// ─── 3-phase animation sequence ──────────────────────────────────────────────
//
// Phase 1: Chat bubble fades in immediately
// Phase 2: After bubble settles (600ms), Eve's question types word-by-word
// Phase 3: After typing completes, subtext + form fade in

const QUESTION_TEXT = "First, I'll need some personal and contact information."
const QUESTION_WORDS = QUESTION_TEXT.split(' ')
const WORD_DELAY_MS = 80

// Animation phases:
// 0 → response bubble fades up (100ms after mount)
// 1 → Eve's new question types word-by-word (after bubble settles, 600ms)
// 2 → subtext + form fade in (after typing completes)

function useAnimationSequence() {
  const reducedMotion = usePrefersReducedMotion()
  const [showBubble, setShowBubble] = useState(false)
  const [visibleWords, setVisibleWords] = useState(0)
  const [typingStarted, setTypingStarted] = useState(false)
  const [done, setDone] = useState(false)

  // Reduced motion: skip straight to the end state.
  useEffect(() => {
    if (!reducedMotion) return
    setShowBubble(true)
    setTypingStarted(true)
    setVisibleWords(QUESTION_WORDS.length)
    setDone(true)
  }, [reducedMotion])

  // Phase 0: bubble fades up shortly after mount
  useEffect(() => {
    if (reducedMotion) return
    const t = setTimeout(() => setShowBubble(true), 100)
    return () => clearTimeout(t)
  }, [reducedMotion])

  // Phase 1: typing starts after bubble has settled
  useEffect(() => {
    if (reducedMotion) return
    if (!showBubble) return
    const t = setTimeout(() => setTypingStarted(true), 600)
    return () => clearTimeout(t)
  }, [reducedMotion, showBubble])

  // Phase 1 continued: advance words one at a time
  useEffect(() => {
    if (reducedMotion) return
    if (!typingStarted) return
    if (visibleWords < QUESTION_WORDS.length) {
      const t = setTimeout(() => setVisibleWords((w) => w + 1), WORD_DELAY_MS)
      return () => clearTimeout(t)
    } else {
      // Phase 2: brief pause then reveal form
      const t = setTimeout(() => setDone(true), 200)
      return () => clearTimeout(t)
    }
  }, [reducedMotion, typingStarted, visibleWords])

  return { showBubble, visibleWords, typingStarted, done }
}

// ─── Validation schema ────────────────────────────────────────────────────────

function validateDob(val: string): true | string {
  const cleaned = val.replace(/\s/g, '')
  const parts = cleaned.split('/')
  if (parts.length !== 3) return 'Enter a valid date (MM / DD / YYYY)'
  const [mm, dd, yyyy] = parts.map(Number)
  const currentYear = new Date().getFullYear()
  if (!mm || mm < 1 || mm > 12) return 'Month must be between 1 and 12'
  if (!yyyy || yyyy < 1900 || yyyy > currentYear) return `Year must be between 1900 and ${currentYear}`
  // Days-in-month check (handles leap years)
  const daysInMonth = new Date(yyyy, mm, 0).getDate()
  if (!dd || dd < 1 || dd > daysInMonth) return `Day must be between 1 and ${daysInMonth} for that month`
  return true
}

function calculateAge(dob: string): number {
  const parts = dob.replace(/\s/g, '').split('/')
  const [month, day, year] = parts.map(Number)
  if (!month || !day || !year || year < 1900) return 0
  const today = new Date()
  const birth = new Date(year, month - 1, day)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  sex: z.enum(['female', 'male'], { required_error: 'Please select a sex assigned at birth' }),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .regex(/^\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4}$/, 'Enter a valid date (MM / DD / YYYY)')
    .refine((val) => validateDob(val) === true, (val) => ({
      message: validateDob(val) as string,
    }))
    .refine((val) => calculateAge(val) >= 18, {
      message: 'You must be at least 18 years old to continue',
    }),
  state: z
    .string()
    .min(1, 'State is required')
    .refine((val) => !BLOCKED_STATES_SET.has(val), {
      message: "PreventiveMD isn't available yet in your state. Please check back soon.",
    }),
  phone: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^\d{10}$/, 'Enter a valid 10-digit US phone number'),
  smsConsent: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Shared field styles ──────────────────────────────────────────────────────

const inputBase =
  'w-full h-[42px] px-3 py-1.5 bg-white border border-[#e4e4e7] rounded-lg shadow-sm ' +
  'text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] ' +
  'focus:outline-none focus:border-[#3A5190] focus-within:border-[#3A5190] transition-colors'

const inputErrorCls = 'border-red-600 focus:border-red-600 focus-within:border-red-600'

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-xs text-red-600 leading-4 mt-1" role="alert">
      {message}
    </p>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PROGRESS = 5 // step 1 of ~14 ≈ 5%

export default function QuestionnaireStep1() {
  const router = useRouter()
  const { showBubble, visibleWords, typingStarted, done } = useAnimationSequence()

  // Load saved values (populated when user navigates back from step 2)
  const saved = getStepValues(0)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: typeof saved.firstName === 'string' ? saved.firstName : '',
      lastName: typeof saved.lastName === 'string' ? saved.lastName : '',
      sex: (saved.sex as 'female' | 'male' | undefined) ?? undefined,
      dateOfBirth: typeof saved.dateOfBirth === 'string' ? saved.dateOfBirth : '',
      state: typeof saved.state === 'string' ? saved.state : '',
      phone: typeof saved.phone === 'string' ? saved.phone : '',
      smsConsent: typeof saved.smsConsent === 'boolean' ? saved.smsConsent : true,
    },
  })

  const selectedSex = watch('sex')

  const [phoneDisplay, setPhoneDisplay] = useState<string>(() =>
    formatPhone(typeof saved.phone === 'string' ? saved.phone : '')
  )

  function handleDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 8) v = v.slice(0, 8)
    let formatted = v
    if (v.length >= 3) formatted = v.slice(0, 2) + ' / ' + v.slice(2)
    if (v.length >= 5) formatted = v.slice(0, 2) + ' / ' + v.slice(2, 4) + ' / ' + v.slice(4)
    setValue('dateOfBirth', formatted, { shouldValidate: false })
    e.target.value = formatted
  }

  function handlePhoneInput(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhoneDisplay(formatPhone(digits))
    setValue('phone', digits, { shouldValidate: false, shouldDirty: true })
  }

  async function onSubmit(data: FormValues) {
    const stateName = US_STATES.find((s) => s.value === data.state)?.label ?? data.state
    const bubbles = [
      `${data.firstName} ${data.lastName}`,
      data.sex === 'female' ? 'Female' : 'Male',
      data.dateOfBirth,
      stateName,
      `+1 ${formatPhone(data.phone)}`,
      ...(data.smsConsent ? ['Opt in to promotional texts'] : []),
    ]
    saveStep(
      0,
      {
        question: "First, I'll need some personal and contact information.",
        bubbles,
      },
      { ...data }
    )
    router.push('/get-started/questionnaire/step-2')
  }

  const animatedText = QUESTION_WORDS.slice(0, visibleWords).join(' ')

  return (
    <>
      <BackHeader backHref="/get-started" progress={PROGRESS} />

      <main id="main-content" tabIndex={-1} className="min-h-screen bg-white pt-12 pb-28 md:pt-14 focus:outline-none">
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

          {/* ── Previous question — static, no animation ── */}
          <div className="flex flex-col gap-4 items-end w-full">
            <div className="flex items-start gap-3 w-full">
              <p className="flex-1 text-sm md:text-base font-medium leading-6 text-[rgba(0,0,0,0.87)]">
                Hi, I&rsquo;m Eve, and I&rsquo;ll be your concierge. Getting started is simple.
              </p>
            </div>

            {/* ── Response bubble — fades up into place ── */}
            <div
              className="transition-all duration-500"
              style={{
                opacity: showBubble ? 1 : 0,
                transform: showBubble ? 'translateY(0)' : 'translateY(6px)',
              }}
            >
              <div className="bg-[#f0f0f0] px-3 py-1 rounded-[100px]">
                <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5 text-right">
                  I consent to the collection and processing of my consumer health data as described in the Consumer Health Data Privacy Policy.
                </p>
              </div>
            </div>
          </div>

          {/* ── Phase 2: Eve's question types in word-by-word ── */}
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
                {typingStarted && animatedText}
                {/* Blinking cursor while typing */}
                {typingStarted && visibleWords < QUESTION_WORDS.length && (
                  <span
                    className="inline-block w-0.5 h-[1em] ml-0.5 bg-[rgba(0,0,0,0.87)] align-middle animate-pulse"
                    aria-hidden="true"
                  />
                )}
              </h1>

              {/* Phase 3: subtext fades in after typing */}
              {done && (
                <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5 animate-[fadeIn_0.3s_ease_forwards]">
                  Fields marked with an asterisk (<span className="text-red-600" aria-hidden="true">*</span>) are required.
                </p>
              )}
            </div>
          </div>

          {/* ── Phase 3: Form fades in after typing ── */}
          {done && (
            <form
              id="step1-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease_forwards]"
            >
              {/* First / Last name */}
              <div className="flex gap-3 items-start">
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-[#09090b] leading-5">
                    First name <span className="text-red-600" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="firstName"
                    {...register('firstName')}
                    type="text"
                    autoComplete="given-name"
                    className={`${inputBase} ${errors.firstName ? inputErrorCls : ''}`}
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                    aria-required="true"
                  />
                  <FieldError id="firstName-error" message={errors.firstName?.message} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-[#09090b] leading-5">
                    Last name <span className="text-red-600" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="lastName"
                    {...register('lastName')}
                    type="text"
                    autoComplete="family-name"
                    className={`${inputBase} ${errors.lastName ? inputErrorCls : ''}`}
                    aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                    aria-required="true"
                  />
                  <FieldError id="lastName-error" message={errors.lastName?.message} />
                </div>
              </div>

              {/* Sex assigned at birth — 0.5rem (8px) gap between label and buttons.
                  <legend> sits outside the fieldset's flex flow, so use mb-2
                  on the legend instead of gap on the fieldset. */}
              <fieldset
                className="border-0 p-0 m-0"
                aria-describedby={errors.sex ? 'sex-error' : undefined}
              >
                <legend id="sex-label" className="mb-2 text-sm font-medium text-[#09090b] leading-5">
                  Sex assigned at birth <span className="text-red-600" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </legend>
                <div role="radiogroup" aria-labelledby="sex-label" className="flex gap-3">
                  {(['female', 'male'] as const).map((sex) => {
                    const isSelected = selectedSex === sex
                    return (
                      /* Gradient border technique:
                         Selected → outer label has gradient bg + p-[2px] + rounded-lg,
                         inner chrome has white bg filling the interior.
                         Unselected → plain 1px border on the chrome itself. */
                      <label
                        key={sex}
                        className="flex-1 rounded-lg cursor-pointer"
                        style={isSelected ? {
                          padding: '2px',
                          background: 'linear-gradient(90deg, #3A5190 0%, #A2D5BC 100%)',
                        } : undefined}
                      >
                        <input
                          type="radio"
                          name="sex"
                          value={sex}
                          checked={isSelected}
                          onChange={() => setValue('sex', sex, { shouldValidate: true })}
                          className="peer sr-only"
                        />
                        <span
                          className={`
                            flex w-full items-center justify-center gap-3 h-10 px-4
                            rounded-[6px] shadow-sm text-base font-medium transition-colors
                            peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-[#3b82f6]
                            ${isSelected
                              ? 'bg-white text-[#3A5190]'
                              : 'bg-white border border-[#e4e4e7] text-[#09090b] hover:bg-gray-50'}
                          `}
                        >
                          {sex === 'female'
                            ? <FemaleIcon active={isSelected} />
                            : <MaleIcon active={isSelected} />
                          }
                          {sex === 'female' ? 'Female' : 'Male'}
                        </span>
                      </label>
                    )
                  })}
                </div>
                {errors.sex && (
                  <p id="sex-error" className="text-xs text-red-600 leading-4" role="alert">
                    {errors.sex.message}
                  </p>
                )}
              </fieldset>

              {/* Date of birth + State */}
              <div className="flex gap-3 items-start">
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <label htmlFor="dob" className="text-sm font-medium text-[#09090b] leading-5">
                    Date of birth <span className="text-red-600" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="dob"
                    type="text"
                    inputMode="numeric"
                    autoComplete="bday"
                    placeholder="MM / DD / YYYY"
                    {...register('dateOfBirth')}
                    onChange={handleDateInput}
                    className={`${inputBase} ${errors.dateOfBirth ? inputErrorCls : ''}`}
                    aria-invalid={!!errors.dateOfBirth}
                    aria-describedby={errors.dateOfBirth ? 'dob-error' : undefined}
                    aria-required="true"
                  />
                  <FieldError id="dob-error" message={errors.dateOfBirth?.message} />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <label htmlFor="state" className="text-sm font-medium text-[#09090b] leading-5">
                    State <span className="text-red-600" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <div className="relative">
                    <select
                      id="state"
                      {...register('state')}
                      defaultValue=""
                      className={`${inputBase} appearance-none pr-8 ${errors.state ? inputErrorCls : ''}`}
                      aria-invalid={!!errors.state}
                      aria-describedby={errors.state ? 'state-error' : undefined}
                      aria-required="true"
                    >
                      <option value="" disabled hidden></option>
                      {US_STATES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                      <ChevronUpDownIcon />
                    </span>
                  </div>
                  <FieldError id="state-error" message={errors.state?.message} />
                </div>
              </div>

              {/* Mobile number */}
              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="text-sm font-medium text-[#09090b] leading-5">
                  Mobile number <span className="text-red-600" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <div className={`${inputBase} flex items-center gap-0 !px-0 overflow-hidden ${errors.phone ? inputErrorCls : ''}`}>
                  <span aria-hidden="true" className="px-3 text-sm text-[#09090b] opacity-50 shrink-0 leading-5">
                    +1
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="(###) ###-####"
                    value={phoneDisplay}
                    onChange={handlePhoneInput}
                    className="flex-1 h-full bg-transparent text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] focus:outline-none border-0 py-1.5 pr-3"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? 'phone-error' : undefined}
                    aria-required="true"
                  />
                </div>
                <FieldError id="phone-error" message={errors.phone?.message} />
              </div>

              {/* SMS consent */}
              <div className="flex gap-3 items-start">
                <div className="flex items-center justify-center h-5 w-4 shrink-0 mt-0.5">
                  <input
                    id="smsConsent"
                    type="checkbox"
                    {...register('smsConsent')}
                    className="size-4 rounded border-[#e4e4e7] text-[#3A5190] focus:ring-[#3b82f6] cursor-pointer accent-[#3A5190]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="smsConsent" className="text-sm font-medium text-[#09090b] leading-5 cursor-pointer">
                    I&rsquo;d like to receive recurring promotional texts from PreventiveMD.
                  </label>
                  <p className="text-sm text-[#71717a] leading-5">
                    Msg &amp; data rates may apply. Message frequency varies. Reply STOP to opt out and HELP for help. Consent is not a condition of purchase.
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* ── Sticky CTA — appears with the form ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-12 pt-4 transition-all duration-500"
        style={{
          opacity: done ? 1 : 0,
          pointerEvents: done ? 'auto' : 'none',
          background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))',
        }}
      >
        <button
          type="submit"
          form="step1-form"
          disabled={isSubmitting || !done}
          className="
            relative flex items-center justify-center gap-3
            w-full md:w-[480px] h-[42px] px-4 overflow-hidden
            rounded-br-[36px] rounded-tl-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
          "
          style={{
            background: 'linear-gradient(90deg, #3A5190 0%, #3A5190 64.61%, #A2D5BC 100%)',
          }}
        >
          {isSubmitting ? 'Saving…' : 'Save and continue'}
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
