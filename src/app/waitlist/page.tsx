'use client'

/*
 * WAITLIST PAGE — src/app/waitlist/page.tsx
 *
 * KEY CONCEPT: useSearchParams
 * In your HTML: waitlist.html?peptide=BPC-157
 * In Next.js: we use the useSearchParams hook to read URL query params.
 * This is a Client Component because useSearchParams is a browser API.
 *
 * KEY CONCEPT: Controlled form inputs
 * In HTML, form data lives in the DOM. In React, form data lives in
 * state (useState). The input's value is always synced with state.
 * This makes it easy to validate, transform, or submit the data.
 */

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function WaitlistForm() {
  const searchParams = useSearchParams()
  const peptide = searchParams.get('peptide') || ''

  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Wire to Supabase or email service
    console.log('Waitlist signup:', { email, peptide })
    setSubmitted(true)
  }

  return (
    <section className="pt-32 pb-20 px-6 md:px-12">
      <div className="max-w-lg mx-auto text-center">
        <div className="section-label justify-center">Coming Soon</div>
        <h1 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extralight tracking-tight text-brand-navy mb-4">
          {peptide ? (
            <>
              Get early access to{' '}
              <span className="gradient-text font-semibold">{peptide}</span>
            </>
          ) : (
            <>Join the waitlist</>
          )}
        </h1>
        <p className="text-sm text-muted font-light leading-relaxed mb-8">
          Be the first to know when this treatment launches. We&apos;ll notify
          you and include an exclusive 25% launch discount.
        </p>

        {submitted ? (
          <div className="bg-brand-mint/10 border border-brand-mint/30 rounded-2xl p-8">
            <div className="text-3xl mb-3">&#10003;</div>
            <h2 className="text-lg font-semibold text-brand-navy mb-2">You&apos;re on the list!</h2>
            <p className="text-sm text-muted font-light">
              We&apos;ll email you at <strong>{email}</strong> when{' '}
              {peptide || 'this treatment'} is available.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10"
            />
            <button
              type="submit"
              className="btn-primary whitespace-nowrap"
            >
              Join Waitlist
            </button>
          </form>
        )}

        <p className="text-xs text-muted/60 mt-4">
          No spam. Just a one-time notification when we launch.
        </p>
      </div>
    </section>
  )
}

// Suspense boundary required for useSearchParams in Next.js 14
export default function WaitlistPage() {
  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <Suspense fallback={<div className="pt-32 text-center text-muted">Loading...</div>}>
        <WaitlistForm />
      </Suspense>
    </main>
  )
}
