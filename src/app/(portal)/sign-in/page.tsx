'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { inferChannel, normalizePhone } from '@/lib/portal-auth'
import { setPortalAuthFlow } from '@/lib/portal-auth-flow'

const AVATAR_URL = '/assets/avatar-eve.png'

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

export default function SignInPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    const channel = inferChannel(identifier)
    if (!channel) {
      setError('Please enter a valid email or 10-digit mobile number.')
      return
    }
    setError(null)
    setIsSubmitting(true)

    // Normalize so step 2 always reads canonical input (lowercase email, digit-only phone).
    const stored = channel === 'email' ? identifier.trim().toLowerCase() : normalizePhone(identifier)
    setPortalAuthFlow({ identifier: stored, channel })
    router.push('/sign-in/verify')
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-[100dvh] bg-white pt-12 md:pt-14 pb-24 focus:outline-none"
    >
      <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col items-center justify-center min-h-[calc(100dvh-9rem)] md:min-h-[calc(100dvh-9.5rem)]">
        <div className="w-full flex flex-col gap-6">

          {/* Eve's welcome */}
          <div className="flex items-start gap-3 w-full">
            <div className="shrink-0 size-8 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <h1 className="flex-1 min-w-0 text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)]">
              Welcome back! Stay on top of your treatments and get ongoing support, all in your Care Portal.
            </h1>
          </div>

          {/* Sign-in prompt */}
          <form className="flex flex-col gap-9" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="identifier" className="text-[12px] font-medium tracking-[1.5px] uppercase text-[#71717a]">
                Email or mobile number
              </label>
              <div className={`h-[42px] border rounded-lg shadow-sm flex items-center overflow-hidden bg-white transition-colors ${error ? 'border-red-600 focus-within:border-red-600' : 'border-[#e4e4e7] focus-within:border-[#3A5190]'}`}>
                <input
                  id="identifier"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  value={identifier}
                  onChange={e => { setIdentifier(e.target.value); if (error) setError(null) }}
                  aria-describedby={error ? 'identifier-error' : undefined}
                  aria-invalid={!!error}
                  aria-required="true"
                  className="flex-1 h-full px-3 text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#a1a1aa] focus:outline-none bg-transparent border-0"
                />
              </div>
              {error && (
                <p id="identifier-error" className="text-xs text-red-600 leading-4 mt-1" role="alert">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="
                relative w-full h-[42px] flex items-center justify-center gap-3 px-4
                overflow-hidden rounded-tl-[36px] rounded-br-[36px]
                text-white text-base font-medium leading-6 whitespace-nowrap
                transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
                shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
              "
              style={{ background: 'linear-gradient(90deg, #3A5190 0%, #3A5190 64.61%, #A2D5BC 100%)' }}
            >
              Sign in
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
          </form>
        </div>
      </div>
    </main>
  )
}
