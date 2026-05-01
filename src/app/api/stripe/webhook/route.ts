/**
 * POST /api/stripe/webhook — Stripe webhook receiver
 *
 * SECURITY: Every event MUST pass signature verification before any side
 * effect. An attacker who can hit this URL can otherwise forge a
 * "succeeded" event and trigger a free visit. We reject anything without
 * a valid signature with 400.
 *
 * RELIABILITY: Stripe delivers each event at-least-once. We dedupe via
 * the stripe_events table (PRIMARY KEY on event.id). The 5-step protocol
 * declared in migration 007:
 *   1. Verify signature.
 *   2. INSERT event row. If unique violation → check processed_at:
 *      - processed_at NOT NULL → already done; return 200.
 *      - processed_at IS NULL  → previous attempt failed; reprocess.
 *   3. Dispatch to the per-type handler.
 *   4. UPDATE processed_at = now() on success.
 *   5. On error, increment attempts, store error, return 500. Stripe
 *      will retry with its own backoff (up to ~3 days).
 *
 * LOCAL DEV: Use the Stripe CLI to forward webhooks to localhost:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 * The CLI prints a temporary signing secret; paste it into
 * .env.local as STRIPE_WEBHOOK_SECRET (it overrides the prod one).
 *
 * PRODUCTION: Register this URL in Stripe Dashboard →
 * Developers → Webhooks → Add endpoint. Copy the signing secret to
 * Vercel env vars as STRIPE_WEBHOOK_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  handleCheckoutSessionCompleted,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handleChargeRefunded,
  handleSubscriptionUpdated,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
} from '@/lib/stripe/webhook-handlers'

// Pin to Node runtime — signature verification uses Node crypto.
// Edge runtime would silently use a polyfill that is slower and
// occasionally subtly different.
export const runtime = 'nodejs'

// Don't cache webhook responses.
export const dynamic = 'force-dynamic'

// Postgres unique-violation SQLSTATE code (used to detect dedup hits).
const PG_UNIQUE_VIOLATION = '23505'


export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Read the raw body — required for signature verification.
  // request.json() would re-serialize and produce a different byte stream.
  const rawBody = await request.text()

  // ── 1. Verify signature ────────────────────────────────
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.warn('[webhook] Signature verification failed', { message })
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ── 2. Record + dedupe ─────────────────────────────────
  const { error: insertErr } = await supabase
    .from('stripe_events')
    .insert({
      id:          event.id,
      type:        event.type,
      livemode:    event.livemode,
      api_version: event.api_version ?? null,
      payload:     event,
    })

  let priorAttempts = 0
  let alreadyProcessed = false

  if (insertErr) {
    if (insertErr.code !== PG_UNIQUE_VIOLATION) {
      // Unexpected DB error — let Stripe retry.
      console.error('[webhook] Failed to record event', { event_id: event.id, error: insertErr })
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    // Duplicate delivery — check whether processing already finished.
    const { data: existing } = await supabase
      .from('stripe_events')
      .select('processed_at, attempts')
      .eq('id', event.id)
      .maybeSingle()

    if (existing?.processed_at) {
      alreadyProcessed = true
    } else {
      priorAttempts = existing?.attempts ?? 0
    }
  }

  if (alreadyProcessed) {
    return NextResponse.json({ received: true, deduped: true })
  }

  // ── 3. Dispatch ────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(supabase, event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(supabase, event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(supabase, event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.refunded':
        await handleChargeRefunded(supabase, event.data.object as Stripe.Charge)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(supabase, event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice)
        break

      default:
        // Subscription events (customer.subscription.*, invoice.*) and
        // anything else land here. We accept them so Stripe stops retrying,
        // but record them as "received but not handled" via no processed_at
        // update — actually, we DO want to mark these processed so Stripe
        // doesn't keep retrying. Mark processed and move on.
        console.info('[webhook] Unhandled event type — acknowledging', { type: event.type, event_id: event.id })
        break
    }

    // ── 4. Mark processed ────────────────────────────────
    await supabase
      .from('stripe_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', event.id)

    return NextResponse.json({ received: true })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('[webhook] Handler failed', { type: event.type, event_id: event.id, error: message })

    await supabase
      .from('stripe_events')
      .update({
        attempts:   priorAttempts + 1,
        last_error: message,
      })
      .eq('id', event.id)

    // 500 → Stripe retries with its own backoff. We cap retries via Stripe
    // settings (max 3 days by default).
    return NextResponse.json({ error: 'Handler failed', message }, { status: 500 })
  }
}
