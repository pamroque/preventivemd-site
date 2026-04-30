/**
 * POST /api/checkout/session — Create a Stripe Payment Intent
 *
 * (Path is kept as /checkout/session for URL stability; the underlying
 * primitive is now a PaymentIntent for inline Stripe Elements, not a
 * Checkout Session. We may rename to /api/payment-intent in a follow-up.)
 *
 * Step 1 (sync $35 visit fee) ONLY in this version. Async menu mode
 * lands when async pricing is finalized (Task #19/20).
 *
 * Request body:
 *   {
 *     submissionId: string,  // intake_submissions.id
 *     patientId:    string,  // patients.id (returned by /api/intake)
 *     mode:         'sync_visit',
 *   }
 *
 * Response (success):
 *   { clientSecret: string, paymentIntentId: string }
 *
 * The frontend uses clientSecret with stripe.confirmCardPayment(),
 * Stripe Elements collects the card data in iframes, and the
 * PaymentIntent is confirmed without card data ever touching our
 * servers (SAQ-A PCI scope).
 *
 * Flow:
 *   1. Validate body
 *   2. Look up the patient
 *   3. Resolve / create Stripe Customer (persists to patients.gateway_customer_ids)
 *   4. Create the PaymentIntent
 *      - amount: $35.00 (3500 cents)
 *      - currency: usd
 *      - customer: <Stripe Customer>
 *      - setup_future_usage: 'off_session'   (saves the card for Step 3)
 *      - automatic_payment_methods: { enabled: true }
 *      - metadata: { patient_id, submission_id, kind: 'sync_visit_fee' }
 *   5. Insert pending payments row (gateway_payment_id = pi_id)
 *   6. Return clientSecret to the frontend
 *
 * Idempotency: Stripe SDK uses an idempotency key keyed on submissionId
 * so re-submits return the same PaymentIntent rather than charging twice.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import { getOrCreateStripeCustomer, type PatientForStripe } from '@/lib/stripe/customer'

// ─── Config ──────────────────────────────────────────────────────────────────

type CheckoutMode = 'sync_visit'

interface CheckoutSessionBody {
  submissionId: string
  patientId:    string
  mode:         CheckoutMode
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CheckoutSessionBody>

    // ── Validate ──────────────────────────────────────────
    if (!body.submissionId || !body.patientId) {
      return NextResponse.json(
        { error: 'Missing required fields: submissionId, patientId' },
        { status: 400 },
      )
    }
    if (body.mode !== 'sync_visit') {
      return NextResponse.json(
        { error: `Unsupported mode: ${body.mode}. Only 'sync_visit' is supported in this version.` },
        { status: 400 },
      )
    }

    const priceId = process.env.STRIPE_PRICE_SYNC_VISIT_FEE
    if (!priceId) {
      console.error('[payment-intent] STRIPE_PRICE_SYNC_VISIT_FEE is not set')
      return NextResponse.json(
        { error: 'Server misconfigured: visit fee price not set' },
        { status: 500 },
      )
    }

    const supabase = createAdminClient()

    // ── Look up the patient ───────────────────────────────
    const { data: patientRow, error: patientErr } = await supabase
      .from('patients')
      .select('id, email, first_name, last_name, phone, gateway_customer_ids')
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
      id:                   patientRow.id,
      email:                patientRow.email,
      first_name:           patientRow.first_name,
      last_name:            patientRow.last_name,
      phone:                patientRow.phone,
      gateway_customer_ids: (patientRow.gateway_customer_ids ?? {}) as Record<string, string>,
    }

    // ── Resolve / create Stripe Customer ──────────────────
    const customerId = await getOrCreateStripeCustomer(supabase, patient)

    // ── Create the PaymentIntent ──────────────────────────
    const stripe = getStripe()

    // Pull the visit-fee amount from the Stripe Price object — keeps the
    // Stripe Dashboard as the single source of truth. If the Price is
    // changed in Stripe, this picks it up without a code deploy.
    const priceObj = await stripe.prices.retrieve(priceId)
    if (!priceObj.unit_amount || !priceObj.currency) {
      console.error('[payment-intent] Visit fee Price missing unit_amount/currency', { price_id: priceId })
      return NextResponse.json({ error: 'Visit fee price is misconfigured in Stripe' }, { status: 500 })
    }

    const pi = await stripe.paymentIntents.create(
      {
        amount:   priceObj.unit_amount,
        currency: priceObj.currency,
        customer: customerId,
        // Save the card on the Customer so Step 3 (Treatment Plan flow)
        // can charge it off-session without re-asking.
        setup_future_usage: 'off_session',
        // Tell Stripe to figure out which payment methods to offer based
        // on the dashboard configuration. Cards on by default; Apple Pay
        // / Google Pay automatically when patient is on a supported device.
        automatic_payment_methods: { enabled: true },
        description: 'PreventiveMD video consultation',
        // Metadata flows through to webhooks and the Stripe Dashboard.
        metadata: {
          patient_id:    patient.id,
          submission_id: body.submissionId,
          kind:          'sync_visit_fee',
        },
        // Send the receipt to the patient's real email after success.
        receipt_email: patient.email,
      },
      {
        // One PaymentIntent per submission. A double-click in the browser
        // returns the same PI rather than creating two.
        idempotencyKey: `pi_${body.submissionId}`,
      },
    )

    if (!pi.client_secret) {
      console.error('[payment-intent] Stripe returned a PI without a client_secret', { pi_id: pi.id })
      return NextResponse.json({ error: 'Stripe did not return a client secret' }, { status: 502 })
    }

    // ── Insert pending payment row (idempotent) ───────────
    // We write the row up-front so the webhook handler has something to
    // UPDATE when payment_intent.succeeded arrives. SELECT-then-INSERT
    // because payments has no unique constraint on (gateway, gateway_payment_id)
    // — adding one is a follow-up migration. Race window is tiny in practice
    // (single browser submitting once); webhook is idempotent regardless.
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
          },
          amount_cents: priceObj.unit_amount,
          currency:     priceObj.currency,
          type:         'consult_fee',
          status:       'pending',
          description:  'Sync video consultation fee',
        })

      if (payErr) {
        // Non-fatal: the patient can still complete payment. Webhook
        // handler will fall back to insert-on-receipt if the row is missing.
        console.error('[payment-intent] Failed to insert pending payment row', { error: payErr, pi_id: pi.id })
      }
    }

    return NextResponse.json({
      clientSecret:    pi.client_secret,
      paymentIntentId: pi.id,
    })

  } catch (error) {
    console.error('[payment-intent] Unhandled error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
