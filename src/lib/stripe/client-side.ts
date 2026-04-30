/**
 * stripe/client-side.ts — Browser-side Stripe.js loader
 *
 * Use this in client components ONLY (never in server code; the server
 * uses lib/stripe/client.ts which carries the secret key).
 *
 * The loader is a Promise that resolves to a Stripe.js instance once
 * the script has loaded from Stripe's CDN. We memoize so multiple
 * <Elements> mounts share a single Stripe.js load.
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js'

let _stripePromise: Promise<Stripe | null> | null = null

export function getStripeBrowser(): Promise<Stripe | null> {
  if (_stripePromise) return _stripePromise

  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    // We can't throw at module level (would crash the build). Instead,
    // return a rejected-ish promise so callers see a clear error.
    console.error(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Set it in .env.local (test mode) ' +
      'or Vercel env vars (production). Stripe Elements will not load until this is configured.'
    )
    _stripePromise = Promise.resolve(null)
    return _stripePromise
  }

  _stripePromise = loadStripe(key)
  return _stripePromise
}
