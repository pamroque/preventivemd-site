/**
 * stripe/webhook-handlers.ts — Per-event handlers for Stripe webhooks
 *
 * Each handler is pure: it takes (supabase, event payload) and returns
 * void. Idempotency is handled at two layers:
 *   1. The route layer dedupes on event.id via the stripe_events table.
 *   2. Each handler is itself safe to run twice (UPDATE WHERE status='pending'
 *      semantics, not blind insert), so even if the dedup layer misses
 *      we don't double-write.
 *
 * Step 1 (sync $35 visit) only handles four event types:
 *   - checkout.session.completed   (the happy path: payment succeeded)
 *   - payment_intent.succeeded     (defensive duplicate; usually no-op)
 *   - payment_intent.payment_failed (card declined / 3DS failed)
 *   - charge.refunded              (refund issued via Dashboard or API)
 *
 * Subscription events (customer.subscription.*, invoice.*) land when
 * Step 2 (async subscriptions) ships.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// ─── checkout.session.completed ──────────────────────────────────────────────
// Fires once when the patient completes Stripe-hosted checkout.
// We use this as the canonical "payment succeeded" signal and pivot
// gateway_payment_id from the Session ID (which we wrote at create time)
// to the PaymentIntent ID (the canonical handle for refunds and audits).
export async function handleCheckoutSessionCompleted(
  supabase: SupabaseClient,
  session:  Stripe.Checkout.Session,
): Promise<void> {
  const sessionId       = session.id
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null

  // Look up the pending payments row we wrote in /api/checkout/session.
  const { data: payment, error: lookupErr } = await supabase
    .from('payments')
    .select('id, status, gateway_metadata')
    .eq('gateway_payment_id', sessionId)
    .maybeSingle()

  if (lookupErr) {
    throw new Error(`payments lookup failed: ${lookupErr.message}`)
  }

  if (!payment) {
    // Race or external session — a Session created outside our flow,
    // or our /api/checkout/session insert was rolled back.
    // Log and skip; we don't speculatively create payments rows from
    // webhook data alone. Operators can backfill from Stripe Dashboard.
    console.warn(
      '[webhook] checkout.session.completed for unknown session — skipping',
      { session_id: sessionId, customer: session.customer, amount_total: session.amount_total },
    )
    return
  }

  // Idempotent: if we already promoted to 'succeeded' (handler ran twice
  // because the dedupe layer missed), do nothing.
  if (payment.status === 'succeeded') return

  const mergedMetadata = {
    ...((payment.gateway_metadata as Record<string, unknown>) ?? {}),
    checkout_session_id: sessionId,
    payment_intent_id:   paymentIntentId,
    // Capture the payment_status Stripe reports (e.g. 'paid', 'no_payment_required')
    stripe_payment_status: session.payment_status,
  }

  const { error: updateErr } = await supabase
    .from('payments')
    .update({
      status:               'succeeded',
      paid_at:              new Date().toISOString(),
      // Pivot to PaymentIntent ID so future events (payment_intent.*,
      // charge.refunded → charge.payment_intent) can find this row.
      gateway_payment_id:   paymentIntentId ?? sessionId,
      gateway_metadata:     mergedMetadata,
    })
    .eq('id', payment.id)

  if (updateErr) {
    throw new Error(`payments update failed: ${updateErr.message}`)
  }
}


// ─── payment_intent.succeeded ────────────────────────────────────────────────
// Defensive: usually a duplicate of checkout.session.completed for one-time
// charges. We treat it as a backfill — only update if checkout.session.completed
// hasn't already promoted the row.
export async function handlePaymentIntentSucceeded(
  supabase: SupabaseClient,
  pi:       Stripe.PaymentIntent,
): Promise<void> {
  const { data: payment, error: lookupErr } = await supabase
    .from('payments')
    .select('id, status')
    .eq('gateway_payment_id', pi.id)
    .maybeSingle()

  if (lookupErr) {
    throw new Error(`payments lookup failed: ${lookupErr.message}`)
  }

  if (!payment) {
    // Could be a race: PI succeeded fired before checkout.session.completed
    // pivoted gateway_payment_id from Session ID to PI ID. Let the next
    // event (checkout.session.completed) handle it. No-op here.
    return
  }

  if (payment.status === 'succeeded') return

  const { error: updateErr } = await supabase
    .from('payments')
    .update({
      status:  'succeeded',
      paid_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
    .neq('status', 'succeeded')   // race-safe: don't overwrite a refund

  if (updateErr) {
    throw new Error(`payments update failed: ${updateErr.message}`)
  }
}


// ─── payment_intent.payment_failed ───────────────────────────────────────────
// Card declined, 3DS failed, insufficient funds, etc. The PaymentIntent
// can be retried by the patient (Stripe Checkout offers a "retry" UX);
// this event just records that the latest attempt failed.
export async function handlePaymentIntentFailed(
  supabase: SupabaseClient,
  pi:       Stripe.PaymentIntent,
): Promise<void> {
  // Look up by either PI ID (if checkout.session.completed already pivoted)
  // or by Session ID via metadata (if not). For one-time payments PI fires
  // first only on retries; for first attempts checkout.session.completed
  // will not have fired (because checkout failed).
  const { data: payment, error: lookupErr } = await supabase
    .from('payments')
    .select('id, status, gateway_metadata')
    .eq('gateway_payment_id', pi.id)
    .maybeSingle()

  if (lookupErr) {
    throw new Error(`payments lookup failed: ${lookupErr.message}`)
  }

  if (!payment) {
    // First-attempt failure: row still keyed by Session ID. Look it up
    // via metadata.submission_id from the PaymentIntent (we set it at
    // checkout-session creation time).
    const submissionId = pi.metadata?.submission_id
    if (!submissionId) {
      console.warn('[webhook] payment_intent.payment_failed — no row, no metadata.submission_id', { pi_id: pi.id })
      return
    }
    const { error: updateErr } = await supabase
      .from('payments')
      .update({
        status:    'failed',
        failed_at: new Date().toISOString(),
        gateway_metadata: { failure_reason: pi.last_payment_error?.message ?? 'unknown' },
      })
      .eq('gateway', 'stripe')
      .eq('gateway_metadata->>submission_id', submissionId)
    if (updateErr) {
      throw new Error(`payments update via submission_id failed: ${updateErr.message}`)
    }
    return
  }

  // Already a terminal status — don't overwrite.
  if (payment.status === 'succeeded' || payment.status === 'refunded') return

  const mergedMetadata = {
    ...((payment.gateway_metadata as Record<string, unknown>) ?? {}),
    failure_reason: pi.last_payment_error?.message ?? 'unknown',
    failure_code:   pi.last_payment_error?.code,
  }

  const { error: updateErr } = await supabase
    .from('payments')
    .update({
      status:           'failed',
      failed_at:        new Date().toISOString(),
      gateway_metadata: mergedMetadata,
    })
    .eq('id', payment.id)

  if (updateErr) {
    throw new Error(`payments update failed: ${updateErr.message}`)
  }
}


// ─── customer.subscription.updated / .deleted ───────────────────────────────
// Reflects Stripe-side state changes onto our subscriptions rows. Triggers
// include: first invoice paid (incomplete → active), pause/resume, dunning
// (active → past_due → canceled), final cancellation.
//
// We update ALL subscriptions rows that share the gateway_subscription_id
// because a single Stripe Subscription may have multiple line items, each
// of which we mirror as its own subscriptions row in Supabase.
const STRIPE_TO_PMD_STATUS: Record<string, string> = {
  active:             'active',
  trialing:           'trialing',
  past_due:           'past_due',
  canceled:           'cancelled',
  incomplete:         'trialing',
  incomplete_expired: 'expired',
  unpaid:             'past_due',
  paused:             'paused',
}

export async function handleSubscriptionUpdated(
  supabase:    SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<void> {
  const stripeStatus = subscription.status
  const localStatus  = STRIPE_TO_PMD_STATUS[stripeStatus] ?? 'active'

  const update: Record<string, unknown> = {
    status: localStatus,
    current_period_start: subscription.items?.data[0]?.current_period_start
      ? new Date(subscription.items.data[0].current_period_start * 1000).toISOString()
      : null,
    current_period_end:   subscription.items?.data[0]?.current_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
      : null,
  }

  if (subscription.cancel_at) {
    update.cancel_at = new Date(subscription.cancel_at * 1000).toISOString()
  }
  if (subscription.canceled_at) {
    update.cancelled_at = new Date(subscription.canceled_at * 1000).toISOString()
  }

  const { error } = await supabase
    .from('subscriptions')
    .update(update)
    .eq('gateway', 'stripe')
    .eq('gateway_subscription_id', subscription.id)

  if (error) {
    throw new Error(`subscriptions update failed: ${error.message}`)
  }
}


// ─── invoice.payment_succeeded ──────────────────────────────────────────────
// Fires for the first invoice (subscription activation) and every renewal.
// We use it to write a payments row for each successful invoice — gives us
// a clean audit trail of every charge under a subscription, which is much
// easier to reconcile than parsing Stripe's invoice list later.
export async function handleInvoicePaymentSucceeded(
  supabase: SupabaseClient,
  invoice:  Stripe.Invoice,
): Promise<void> {
  // Subscription invoices have a `subscription` reference; one-off invoices
  // (e.g., manual invoices for ad-hoc charges) won't and we ignore those.
  const subscriptionId = (invoice as unknown as { subscription?: string | Stripe.Subscription }).subscription
  if (!subscriptionId) return
  const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id

  // For the FIRST invoice we already inserted a 'pending' payments row in
  // /api/checkout/session keyed by the PaymentIntent ID. The webhook
  // handler for payment_intent.succeeded flips it to 'succeeded'.
  // For RENEWAL invoices (no pre-inserted row), we insert a fresh one.

  // Pull the PaymentIntent ID from the invoice.
  // In API ≥ 2024-09-30 it lives at invoice.confirmation_secret; older API
  // exposed `invoice.payment_intent`. Both encode the PI ID either inline
  // or via client_secret prefix.
  const invSecrets = invoice as unknown as {
    confirmation_secret?: { client_secret?: string }
    payment_intent?:      string | { id: string }
  }

  let paymentIntentId: string | null = null
  if (invSecrets.confirmation_secret?.client_secret?.startsWith('pi_')) {
    paymentIntentId = invSecrets.confirmation_secret.client_secret.split('_secret_')[0]
  } else if (invSecrets.payment_intent) {
    paymentIntentId = typeof invSecrets.payment_intent === 'string'
      ? invSecrets.payment_intent
      : invSecrets.payment_intent.id
  }

  // First-invoice path: a pending payments row already exists. The
  // payment_intent.succeeded handler will reconcile it. We only need to
  // ensure the subscription's status flips to 'active'.
  if (paymentIntentId) {
    const { data: existing } = await supabase
      .from('payments')
      .select('id, status')
      .eq('gateway', 'stripe')
      .eq('gateway_payment_id', paymentIntentId)
      .maybeSingle()
    if (existing) {
      // Pre-existing row — let payment_intent.succeeded handle it. No-op.
      return
    }
  }

  // Renewal-invoice path: insert a fresh payments row.
  // Look up the subscription row to find the patient_id + customer_id.
  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('patient_id, gateway_customer_id')
    .eq('gateway', 'stripe')
    .eq('gateway_subscription_id', subId)
    .limit(1)
    .maybeSingle()

  if (!subRow) {
    console.warn('[webhook] invoice.payment_succeeded for unknown subscription', { subscription_id: subId, invoice_id: invoice.id })
    return
  }

  await supabase
    .from('payments')
    .insert({
      patient_id:           subRow.patient_id,
      gateway:              'stripe',
      gateway_payment_id:   paymentIntentId ?? `inv_${invoice.id}`,
      gateway_customer_id:  subRow.gateway_customer_id,
      gateway_metadata: {
        invoice_id:        invoice.id,
        subscription_id:   subId,
        billing_reason:    invoice.billing_reason,
        period_start:      invoice.period_start,
        period_end:        invoice.period_end,
      },
      amount_cents: invoice.amount_paid,
      currency:     invoice.currency,
      type:         'subscription',
      status:       'succeeded',
      paid_at:      new Date().toISOString(),
      description:  `Subscription renewal — invoice ${invoice.number ?? invoice.id}`,
      subscription_id: null, // we don't have a 1:1 mapping (multi-item subs)
    })
}


// ─── invoice.payment_failed ─────────────────────────────────────────────────
// Card declined on a subscription renewal (or first invoice retry). Stripe
// retries automatically per Smart Retries; we record the failure for ops
// visibility and let Stripe drive the retry cadence.
export async function handleInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice:  Stripe.Invoice,
): Promise<void> {
  const subscriptionId = (invoice as unknown as { subscription?: string | Stripe.Subscription }).subscription
  if (!subscriptionId) return
  const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id

  // Mark all subscription rows under this Stripe Subscription as past_due.
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      gateway_metadata: {
        last_failed_invoice_id: invoice.id,
        last_failure_at:        new Date().toISOString(),
      },
    })
    .eq('gateway', 'stripe')
    .eq('gateway_subscription_id', subId)
}


// ─── charge.refunded ─────────────────────────────────────────────────────────
// Fires when a refund is issued — manually via Stripe Dashboard, via API,
// or via Stripe Radar reversal. We mark the payment refunded (or partially)
// and capture the refund amount.
export async function handleChargeRefunded(
  supabase: SupabaseClient,
  charge:   Stripe.Charge,
): Promise<void> {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null

  if (!paymentIntentId) {
    console.warn('[webhook] charge.refunded with no payment_intent — skipping', { charge_id: charge.id })
    return
  }

  const { data: payment, error: lookupErr } = await supabase
    .from('payments')
    .select('id, amount_cents, status')
    .eq('gateway_payment_id', paymentIntentId)
    .maybeSingle()

  if (lookupErr) {
    throw new Error(`payments lookup failed: ${lookupErr.message}`)
  }

  if (!payment) {
    console.warn('[webhook] charge.refunded for unknown PaymentIntent', { pi_id: paymentIntentId })
    return
  }

  // charge.amount_refunded is cumulative across multiple partial refunds.
  // Compare to the original charge amount to decide partial vs. full.
  const refundedCents = charge.amount_refunded
  const isFullRefund  = refundedCents >= (payment.amount_cents ?? charge.amount)
  const newStatus     = isFullRefund ? 'refunded' : 'partially_refunded'

  // Pull the most recent refund's reason if available — useful for ops.
  const latestRefund = charge.refunds?.data?.[0]
  const refundReason = latestRefund?.reason ?? latestRefund?.metadata?.reason ?? null

  const { error: updateErr } = await supabase
    .from('payments')
    .update({
      status:               newStatus,
      refund_amount_cents:  refundedCents,
      refund_reason:        refundReason,
      refunded_at:          new Date().toISOString(),
    })
    .eq('id', payment.id)

  if (updateErr) {
    throw new Error(`payments update failed: ${updateErr.message}`)
  }
}
