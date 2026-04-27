'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import OtpInput from '@/components/portal/OtpInput'
import {
  formatIdentifierForHeading,
  verifyCredentials,
  type Channel,
} from '@/lib/portal-auth'
import { clearPortalAuthFlow, getPortalAuthFlow } from '@/lib/portal-auth-flow'

const AVATAR_URL = '/assets/avatar-eve.png'
const RESEND_SECONDS = 60

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

export default function VerifyPage() {
  const router = useRouter()

  // Identifier + channel come from sessionStorage. If neither is present
  // (user landed here directly), bounce to step 1 so they can enter one.
  const [identifier, setIdentifier] = useState('')
  const [channel, setChannel] = useState<Channel>('email')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const flow = getPortalAuthFlow()
    if (!flow) {
      router.replace('/sign-in')
      return
    }
    setIdentifier(flow.identifier)
    setChannel(flow.channel)
    setHydrated(true)
  }, [router])

  // Form state
  const [dob, setDob] = useState('')
  const [lastName, setLastName] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Resend timer
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function handleResend() {
    // Mock resend — restart the timer. Real implementation would POST to
    // /api/auth/send-otp here.
    setSecondsLeft(RESEND_SECONDS)
    setOtp('')
  }

  function handleDobInput(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8)
    if (v.length >= 5) {
      v = `${v.slice(0, 2)} / ${v.slice(2, 4)} / ${v.slice(4)}`
    } else if (v.length >= 3) {
      v = `${v.slice(0, 2)} / ${v.slice(2)}`
    }
    setDob(v)
    if (error) setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    // Strip the spaces around the slashes so the mock comparison is consistent.
    const dobNormalized = dob.replace(/\s+/g, '')

    if (!dobNormalized || !lastName.trim() || otp.replace(/\D/g, '').length !== 6) {
      setError('Please complete every field, including all six digits of the passcode.')
      return
    }

    setIsSubmitting(true)
    const ok = verifyCredentials({
      identifier,
      channel,
      dob: dobNormalized,
      lastName,
      otp: otp.replace(/\D/g, ''),
    })

    if (ok) {
      clearPortalAuthFlow()
      router.push('/journey')
    } else {
      setIsSubmitting(false)
      setError("We couldn't verify your identity. Please double-check your information and try again.")
    }
  }

  const headingTarget = formatIdentifierForHeading(identifier, channel)

  return (
    <>
      <BackHeader backHref="/sign-in" />

      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-[100dvh] bg-white pt-12 pb-12 focus:outline-none"
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col items-center justify-center min-h-[calc(100dvh-3rem)]">
          <div className="w-full flex flex-col gap-9">

            {/* Eve's prompt */}
            <div className="flex items-start gap-3 w-full">
              <div className="shrink-0 size-8 rounded-full overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
              </div>
              <h1 className="flex-1 min-w-0 text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)]">
                Please verify your identity and enter the passcode sent to{' '}
                <span className="text-[#0778ba]">{hydrated ? headingTarget : '…'}</span>.
              </h1>
            </div>

            <form className="flex flex-col gap-9" onSubmit={handleSubmit} noValidate>
              {/* DOB + Last name (2-up) */}
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
                    value={dob}
                    onChange={handleDobInput}
                    aria-required="true"
                    className="w-full h-[42px] px-3 py-1.5 bg-white border border-[#e4e4e7] rounded-lg shadow-sm text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] focus:outline-none focus:border-[#0778ba] transition-colors"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-[#09090b] leading-5">
                    Last name <span className="text-red-600" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={e => { setLastName(e.target.value); if (error) setError(null) }}
                    aria-required="true"
                    className="w-full h-[42px] px-3 py-1.5 bg-white border border-[#e4e4e7] rounded-lg shadow-sm text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] focus:outline-none focus:border-[#0778ba] transition-colors"
                  />
                </div>
              </div>

              {/* OTP */}
              <div className="flex flex-col gap-2">
                <label id="otp-label" className="text-sm font-medium text-[#09090b] leading-5">
                  One-time passcode (OTP) <span className="text-red-600" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <OtpInput
                  value={otp}
                  onChange={v => { setOtp(v); if (error) setError(null) }}
                  ariaLabelledBy="otp-label"
                  ariaDescribedBy={error ? 'verify-error' : undefined}
                  invalid={!!error}
                />
                {secondsLeft > 0 ? (
                  <p className="text-sm text-[#71717a] leading-5" aria-live="polite">
                    Resend in {secondsLeft} second{secondsLeft === 1 ? '' : 's'}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="self-start text-sm font-bold text-[#0778ba] underline leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba] rounded-sm"
                  >
                    Resend now
                  </button>
                )}
              </div>

              {error && (
                <p id="verify-error" className="text-sm text-red-600 leading-5 -mt-4" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  relative w-full h-[42px] flex items-center justify-center gap-3 px-4
                  overflow-hidden rounded-tl-[36px] rounded-br-[36px]
                  text-white text-base font-medium leading-6 whitespace-nowrap
                  transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
                  shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
                "
                style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
              >
                {isSubmitting ? 'Verifying…' : 'Continue'}
                <ChevronRightIcon />
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
