/**
 * POST /api/checkout/session — Create a Stripe PaymentIntent or Subscription
 *
 * Two modes, both return a `clientSecret` the frontend confirms inline via
 * Stripe Elements (stripe.confirmCardPayment).
 *
 * Mode: 'sync_visit'
 *   $35 one-time visit fee. Creates a PaymentIntent with
 *   setup_future_usage='off_session' to save the card for the post-visit
 *   Treatment Plan flow (Step 3).
 *
 * Mode: 'async_subscription'
 *   Multi-item subscription cart. Creates one Stripe Subscription with
 *   payment_behavior='default_incomplete' so the first invoice's
 *   PaymentIntent is exposed for inline confirmation. All cart items
 *   must share the same recurring interval (Stripe constraint).
 *
 * Request body:
 *   mode='sync_visit':
 *     { mode, submissionId, patientId }
 *   mode='async_subscription':
 *     { mode, submissionId, patientId, cart: [{ treatment_id, type?, formulation, term }] }
 *
 * Response (success):
 *   { clientSecret, paymentIntentId }
 *   Plus for async: { subscriptionId }
 *
 * Idempotency: Stripe SDK uses a key derived from submissionId so re-submits
 * return the same PaymentIntent / Subscription rather than charging twice.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import { getOrCreateStripeCustomer, type PatientForStripe } from '@/lib/stripe/customer'
import type Stripe from 'stripe'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SyncVisitBody {
  mode:         'sync_visit'
  submissionId: string
  patientId:    string
}

interface CartItem {
  /** Questionnaire-level treatment id, e.g. 'glp-1', 'ghk-cu', 'nad-plus'. */
  treatment_id: string
  /** GLP-1 sub-choice — disambiguates semaglutide vs tirzepatide. */
  type?:        string
  /** 'injection' | 'oral' (matches treatment_formulations.formulation). */
  formulation:  string
  /** '1mo' | '3mo' | '6mo' | '12mo' (matches payment_gateway_prices.term). */
  term:         string
}

interface AsyncSubscriptionBody {
  mode:         'async_subscription'
  submissionId: string
  patientId:    string
  cart:         CartItem[]
}

type CheckoutSessionBody = SyncVisitBody | AsyncSubscriptionBody


// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map questionnaire treatment IDs to canonical catalog slugs. The
 * questionnaire has a top-level 'glp-1' that splits into semaglutide
 * vs tirzepatide via choice.type; other ids match catalog 1:1.
 */
function resolveCatalogSlug(treatmentId: string, type: string | undefined): string {
  if (treatmentId === 'glp-1') {
    return type === 'tirzepatide' ? 'tirzepatide' : 'semaglutide'
  }
  return treatmentId
}

interface ResolvedCartItem {
  cart_item:    CartItem
  catalog_slug: string
  price_id:     string
  amount_cents: number
  currency:     string
}

/**
 * Resolve every cart item to a Stripe Price via the payment_gateway_prices
 * table. Returns null + error message if any item can't be resolved or if
 * the cart mixes billing intervals (unsupported in v1).
 */
async function resolveCart(
  supabase: ReturnType<typeof createAdminClient>,
  cart:     CartItem[],
): Promise<{ resolved: ResolvedCartItem[]; intervalKey: string } | { error: string }> {
  if (!cart || cart.length === 0) {
    return { error: 'Cart is empty' }
  }

  // Validate same term across all items — Stripe Subscription items must
  // share recurring.interval. For v1 we use term as the interval proxy
  // (1mo→monthly, 3mo→every-3-months, 6mo→every-6-months, 12mo→yearly).
  const distinctTerms = new Set(cart.map(c => c.term))
  if (distinctTerms.size > 1) {
    return { error: `Cart contains mixed billing terms (${[...distinctTerms].join(', ')}). All treatments must use the same term in this version.` }
  }

  const resolved: ResolvedCartItem[] = []

  for (const item of cart) {
    const slug = resolveCatalogSlug(item.treatment_id, item.type)

    const { data, error } = await supabase
      .from('payment_gateway_prices')
      .select(`
        external_id,
        unit_amount_cents,
        currency,
        treatment_formulations!inner (
          formulation,
          treatments!inner ( slug )
        )
      `)
      .eq('gateway', 'stripe')
      .eq('is_active', true)
      .eq('term', item.term)
      .eq('treatment_formulations.formulation', item.formulation)
      .eq('treatment_formulations.treatments.slug', slug)
      .limit(1)
      .maybeSingle()

    if (error) {
      return { error: `Pricing lookup failed for ${slug}/${item.formulation}/${item.term}: ${error.message}` }
    }
    if (!data) {
      return { error: `No active price found for ${slug}/${item.formulation}/${item.term}` }
    }

    const row = data as unknown as {
      external_id:       string
      unit_amount_cents: number
      currency:          string
    }

    resolved.push({
      cart_item:    item,
      catalog_slug: slug,
      price_id:     row.external_id,
      amount_cents: row.unit_amount_cents,
      currency:     row.currency,
    })
  }

  return { resolved, intervalKey: [...distinctTerms][0] }
}


// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CheckoutSessionBody>

    if (!body.submissionId || !body.patientId) {
      return NextResponse.json(
        { error: 'Missing required fields: submissionId, patientId' },
        { status: 400 },
      )
    }
    if (body.mode !== 'sync_visit' && body.mode !== 'async_subscription') {
      return NextResponse.json(
        { error: `Unsupported mode: ${body.mode}` },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // ── Look up the patient (shared across modes) ─────────
    const { data: patientRow, error: patientErr } = await supabase
      .from('patients')
      .select('id, email, first_name, last_name, phone')
      .eq('id', body.patientId)
      .maybeSingle()

    if (patientErr || !patientRow) {
      console.error('[payment-intent] Patient lookup failed', { patient_id: body.patientId, error: patientErr })
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    if (!patientRow.email || patientRow.email.endsWith('@intake.preventivemd.com')) {
      return NextResponse.json(
        { error: 'Patient email is not finalized. Re-submit intake to attach a real email before checkout.' },
        { status: 400 },
      )
    }

    const patient: PatientForStripe = {
      id:         patientRow.id,
      email:      patientRow.email,
      first_name: patientRow.first_name,
      last_name:  patientRow.last_name,
      phone:      patientRow.phone,
    }

    const customerId = await getOrCreateStripeCustomer(supabase, patient)
    const stripe = getStripe()

    // ── Mode dispatch ─────────────────────────────────────
    if (body.mode === 'sync_visit') {
      return handleSyncVisit(stripe, supabase, body as SyncVisitBody, patient, customerId)
    }
    return handleAsyncSubscription(stripe, supabase, body as AsyncSubscriptionBody, patient, customerId)

  } catch (error) {
    console.error('[payment-intent] Unhandled error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}


// ─── Sync visit handler ─────────────────────────────────────────────────────

async function handleSyncVisit(
  stripe:     Stripe,
  supabase:   ReturnType<typeof createAdminClient>,
  body:       SyncVisitBody,
  patient:    PatientForStripe,
  customerId: string,
) {
  // Source of truth: service_pricing table (managed by the seed script,
  // which reflects pricing-config.ts → Stripe → Supabase). No env var
  // dependency for the price ID/amount.
  const { data: svcRow, error: svcErr } = await supabase
    .from('service_pricing')
    .select('external_id, unit_amount_cents, currency')
    .eq('service_key', 'sync_visit')
    .eq('gateway', 'stripe')
    .eq('is_active', true)
    .maybeSingle()

  if (svcErr || !svcRow) {
    console.error('[payment-intent] Sync visit pricing lookup failed', { error: svcErr })
    return NextResponse.json(
      { error: 'Sync visit fee not configured. Run the pricing seed script.' },
      { status: 500 },
    )
  }

  const priceId = svcRow.external_id
  const amountCents = svcRow.unit_amount_cents
  const currency = svcRow.currency

  const pi = await stripe.paymentIntents.create(
    {
      amount:   amountCents,
      currency: currency,
      customer: customerId,
      setup_future_usage: 'off_session',
      automatic_payment_methods: { enabled: true },
      description: 'PreventiveMD video consultation',
      metadata: {
        patient_id:    patient.id,
        submission_id: body.submissionId,
        kind:          'sync_visit_fee',
      },
      receipt_email: patient.email,
    },
    {
      idempotencyKey: `pi_${body.submissionId}`,
    },
  )

  if (!pi.client_secret) {
    console.error('[payment-intent] Stripe returned a PI without a client_secret', { pi_id: pi.id })
    return NextResponse.json({ error: 'Stripe did not return a client secret' }, { status: 502 })
  }

  // Insert pending payment row (idempotent via SELECT-then-INSERT).
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('gateway', 'stripe')
    .eq('gateway_payment_id', pi.id)
    .maybeSingle()

  if (!existingPayment) {
    const { error: payErr } = await supabase
      .from('payments')
      .insert({
        patient_id:           patient.id,
        gateway:              'stripe',
        gateway_payment_id:   pi.id,
        gateway_customer_id:  customerId,
        gateway_metadata: {
          payment_intent_id: pi.id,
          submission_id:     body.submissionId,
          mode:              'sync_visit',
          price_id:          priceId,
          service_key:       'sync_visit',
        },
        amount_cents: amountCents,
        currency:     currency,
        type:         'consult_fee',
        status:       'pending',
        description:  'Sync video consultation fee',
      })

    if (payErr) {
      console.error('[payment-intent] Failed to insert pending payment row', { error: payErr, pi_id: pi.id })
    }
  }

  return NextResponse.json({
    clientSecret:    pi.client_secret,
    paymentIntentId: pi.id,
  })
}


// ─── Async subscription handler ─────────────────────────────────────────────

async function handleAsyncSubscription(
  stripe:     Stripe,
  supabase:   ReturnType<typeof createAdminClient>,
  body:       AsyncSubscriptionBody,
  patient:    PatientForStripe,
  customerId: string,
) {
  // 1. Resolve every cart item to a Stripe Price ID.
  const resolveResult = await resolveCart(supabase, body.cart ?? [])
  if ('error' in resolveResult) {
    return NextResponse.json({ error: resolveResult.error }, { status: 400 })
  }
  const { resolved } = resolveResult

  // 2. Create a Stripe Subscription with all items.
  //    payment_behavior='default_incomplete' returns a Subscription whose
  //    latest_invoice has an unconfirmed PaymentIntent. The frontend
  //    confirms it via stripe.confirmCardPayment, which charges the first
  //    invoice and saves the card to the customer.
  const subscription = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: resolved.map(r => ({ price: r.price_id })),
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        // Card only for v1; Apple Pay etc. via Elements automatic_payment_methods.
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.confirmation_secret', 'latest_invoice.payment_intent'],
      metadata: {
        patient_id:    patient.id,
        submission_id: body.submissionId,
        kind:          'async_subscription',
        cart_summary:  resolved.map(r => `${r.catalog_slug}/${r.cart_item.formulation}/${r.cart_item.term}`).join(','),
      },
    },
    {
      idempotencyKey: `sub_${body.submissionId}`,
    },
  )

  // 3. Pull the clientSecret from the first invoice.
  //    Stripe API ≥ 2024-09-30 exposes this via `latest_invoice.confirmation_secret`
  //    (the older `latest_invoice.payment_intent` was deprecated). The value is
  //    still a PaymentIntent client_secret format (`pi_xxx_secret_xxx`), so
  //    stripe.confirmCardPayment on the frontend works without changes.
  const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null
  const invoiceWithSecrets = latestInvoice as unknown as {
    confirmation_secret?: { client_secret?: string; type?: string }
    payment_intent?:      Stripe.PaymentIntent | string
  } | null

  let clientSecret: string | null = null
  let paymentIntentId: string | null = null

  // Preferred (current API): confirmation_secret on the invoice.
  if (invoiceWithSecrets?.confirmation_secret?.client_secret) {
    clientSecret = invoiceWithSecrets.confirmation_secret.client_secret
    // PI ID lives in the prefix of the client secret: pi_<ID>_secret_<rand>
    if (clientSecret.startsWith('pi_')) {
      paymentIntentId = clientSecret.split('_secret_')[0]
    }
  }
  // Fallback (older API versions): direct payment_intent reference.
  else if (invoiceWithSecrets?.payment_intent) {
    const ref = invoiceWithSecrets.payment_intent
    const pi = typeof ref === 'string' ? await stripe.paymentIntents.retrieve(ref) : ref
    clientSecret    = pi.client_secret ?? null
    paymentIntentId = pi.id
  }

  if (!clientSecret) {
    console.error('[payment-intent] Subscription missing client_secret on invoice', {
      subscription_id:        subscription.id,
      invoice_id:             latestInvoice?.id,
      has_confirmation_secret: !!invoiceWithSecrets?.confirmation_secret,
      has_payment_intent:      !!invoiceWithSecrets?.payment_intent,
    })
    return NextResponse.json(
      { error: 'Stripe did not return a confirmable client secret for the subscription' },
      { status: 502 },
    )
  }

  // For downstream code that expects a PI-like object, build a minimal stand-in.
  // Used for the payments row insert below.
  const pi = {
    id:             paymentIntentId ?? `unknown_${subscription.id}`,
    client_secret:  clientSecret,
    currency:       resolved[0]?.currency ?? 'usd',
  }

  // 4. Mirror the subscription + first-invoice payment in Supabase.
  //    These rows are idempotent; webhook events refine status later.
  const totalAmountCents = resolved.reduce((sum, r) => sum + r.amount_cents, 0)
  const term = resolved[0].cart_item.term

  // Subscription rows: one per cart line item, all sharing the same
  // gateway_subscription_id. This makes it easy to query "which
  // treatments is this patient subscribed to" by joining patient_treatments.
  for (const r of resolved) {
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('gateway', 'stripe')
      .eq('gateway_subscription_id', subscription.id)
      .eq('gateway_price_id', r.price_id)
      .maybeSingle()

    if (existingSub) continue

    // Look up our internal treatment_id for the patient_treatments link.
    const { data: treatmentRow } = await supabase
      .from('treatments')
      .select('id')
      .eq('slug', r.catalog_slug)
      .maybeSingle()

    await supabase
      .from('subscriptions')
      .insert({
        patient_id:              patient.id,
        treatment_id:            treatmentRow?.id ?? null,
        gateway:                 'stripe',
        gateway_subscription_id: subscription.id,
        gateway_customer_id:     customerId,
        gateway_price_id:        r.price_id,
        gateway_metadata: {
          formulation:   r.cart_item.formulation,
          term:          r.cart_item.term,
          submission_id: body.submissionId,
          subscription_status_at_create: subscription.status,
        },
        plan_name: `${r.catalog_slug} ${r.cart_item.formulation} (${r.cart_item.term})`,
        amount_cents: r.amount_cents,
        currency:     r.currency,
        interval:     termToInterval(term),
        status:       'trialing',  // 'incomplete' equivalent — webhook flips to 'active' on payment success
      })
  }

  // First invoice payment (one row total, since invoice covers all items).
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('gateway', 'stripe')
    .eq('gateway_payment_id', pi.id)
    .maybeSingle()

  if (!existingPayment) {
    await supabase
      .from('payments')
      .insert({
        patient_id:           patient.id,
        gateway:              'stripe',
        gateway_payment_id:   pi.id,
        gateway_customer_id:  customerId,
        gateway_metadata: {
          payment_intent_id:       pi.id,
          submission_id:           body.submissionId,
          mode:                    'async_subscription',
          subscription_id:         subscription.id,
          invoice_id:              latestInvoice?.id,
          cart_size:               resolved.length,
        },
        amount_cents: totalAmountCents,
        currency:     pi.currency ?? 'usd',
        type:         'subscription',
        status:       'pending',
        description:  `Async subscription first invoice (${resolved.length} item${resolved.length > 1 ? 's' : ''})`,
      })
  }

  return NextResponse.json({
    clientSecret:    pi.client_secret,
    paymentIntentId: pi.id,
    subscriptionId:  subscription.id,
  })
}


/** Map our term IDs to the subscriptions.interval enum from migration 001. */
function termToInterval(term: string): 'weekly' | 'monthly' | 'quarterly' | 'annually' {
  switch (term) {
    case '1mo':  return 'monthly'
    case '3mo':  return 'quarterly'
    case '6mo':  return 'quarterly'   // 6mo isn't in the enum; treat as quarterly-ish
    case '12mo': return 'annually'
    default:     return 'monthly'
  }
}
