/**
 * stripe/client.ts — Server-side Stripe SDK
 *
 * Use this ONLY in server-side code (API routes, Server Actions).
 * Never import this in client components — it carries the secret key.
 *
 * The SDK is instantiated lazily so a Next.js dev rebuild doesn't hold
 * a stale connection. We cap the API version explicitly so a Stripe
 * upgrade doesn't silently change response shapes underneath us.
 */

import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env.local (test mode) or ' +
      'Vercel env vars (production).'
    )
  }

  _stripe = new Stripe(key, {
    // Pin the API version so SDK upgrades don't ship behavior changes
    // to us silently. Bump intentionally when we test against a new version.
    apiVersion: '2026-04-22.dahlia',
    // Tag every request with our app name. Shows up in Stripe's logs and
    // makes debugging across environments much easier.
    appInfo: {
      name:    'PreventiveMD',
      version: '0.1.0',
      url:     'https://preventivemd.com',
    },
    // Default to 2 retries on network errors. Stripe's SDK does smart
    // retries (idempotent ops only); this matches their recommended setup.
    maxNetworkRetries: 2,
  })

  return _stripe
}
