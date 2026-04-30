/**
 * POST /api/checkout/session — Create a Stripe Checkout Session
 *
 * Step 1 (sync $35 visit fee) ONLY in this version. Async subscription
 * mode lands in a follow-up once async pricing is finalized (Task #19).
 *
 * Request body:
 *   {
 *     submissionId: string,  // intake_submissions.id
 *     patientId:    string,  // patients.id (returned by /api/intake)
 *     mode:         'sync_visit',
 *   }
 *
 * Response (success):
 *   { url: string, sessionId: string }
 *
 * Response (error):
 *   { error: string }
 *
 * Flow:
 *   1. Validate body
 *   2. Look up the patient (need email + Stripe customer link)
 *   3. Resolve Stripe Customer (create if needed; persisted to patients.gateway_customer_ids)
 *   4. Create the Stripe Checkout Session
 *      - mode: 'payment'                          (one-time)
 *      - line_items: [{ price: visit_fee, qty: 1 }]
 *      - payment_intent_data.setup_future_usage: 'off_session'  (saves the card)
 *      - customer: <Stripe Customer>
 *      - metadata: { patient_id, submission_id }  (so the webhook can join back)
 *   5. Insert a 'pending' payments row
 *   6. Return the Checkout URL — the frontend redirects to it
 *
 * Idempotency: the Stripe SDK uses an idempotency key keyed on
 * submissionId so a double-click doesn't create two Sessions/charges.
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

function getOrigin(request: NextRequest): string {
  // Prefer the explicit env, fall back to the request's origin.
  // Vercel sets VERCEL_URL (without protocol) on deployments.
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv

  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`

  return request.nextUrl.origin
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
      console.error('[checkout/session] STRIPE_PRICE_SYNC_VISIT_FEE is not set')
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
      console.error('[checkout/session] Patient lookup failed', { patient_id: body.patientId, error: patientErr })
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // We need a real, deliverable email to receive the Stripe receipt.
    // The intake API uses a placeholder "<phone>@intake.preventivemd.com"
    // until checkout — so by the time we hit this route, the real email
    // should already be persisted. If not, refuse rather than send the
    // receipt into the void.
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

    // ── Create the Checkout Session ───────────────────────
    const stripe = getStripe()
    const origin = getOrigin(request)

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: customerId,
        line_items: [
          { price: priceId, quantity: 1 },
        ],
        payment_intent_data: {
          // Save the card on the Customer so the post-visit Treatment Plan
          // flow (Step 3) can charge it off-session without re-asking.
          setup_future_usage: 'off_session',
          // Tag the underlying PaymentIntent so the webhook can reconcile
          // even if we missed checkout.session.completed.
          metadata: {
            patient_id:     patient.id,
            submission_id:  body.submissionId,
            kind:           'sync_visit_fee',
          },
          description: 'PreventiveMD video consultation',
        },
        // Top-level metadata mirrors the PaymentIntent's; both surfaces
        // are useful in different webhook handlers.
        metadata: {
          patient_id:     patient.id,
          submission_id:  body.submissionId,
          kind:           'sync_visit_fee',
        },
        // Pre-fill so the patient doesn't re-type their email
        customer_update: { address: 'auto' },
        // Where Stripe sends the patient after success / cancel
        success_url: `${origin}/get-started/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${origin}/get-started/questionnaire/checkout?canceled=1`,
        // Stripe receipt to the patient's email automatically
        // (controlled in Dashboard → Settings → Email; on by default in test mode)
      },
      {
        // One Session per submission. A double-click in the browser
        // returns the same Session URL instead of charging twice.
        idempotencyKey: `checkout_${body.submissionId}`,
      },
    )

    if (!session.url) {
      console.error('[checkout/session] Stripe returned a Session without a URL', { session_id: session.id })
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 })
    }

    // ── Insert pending payment row ────────────────────────
    // We write the row up-front so the webhook handler has something to
    // UPDATE when checkout.session.completed arrives. If the patient
    // abandons, the row stays 'pending' and a daily cleanup can mark it
    // 'failed'/'expired' (out of scope for v1).
    const { error: payErr } = await supabase
      .from('payments')
      .insert({
        patient_id:           patient.id,
        gateway:              'stripe',
        gateway_payment_id:   session.id,            // we use the Session ID as the lookup key here
        gateway_customer_id:  customerId,
        gateway_metadata: {
          checkout_session_id: session.id,
          submission_id:       body.submissionId,
          mode:                'sync_visit',
        },
        amount_cents: session.amount_total ?? 3500,  // $35 — Stripe also returns this for confirmation
        currency:     session.currency ?? 'usd',
        type:         'consult_fee',
        status:       'pending',
        description:  'Sync video consultation fee',
      })

    if (payErr) {
      // Non-fatal: the patient can still complete checkout. The webhook
      // handler will fall back to insert-on-receipt if the row is missing.
      console.error('[checkout/session] Failed to insert pending payment row', { error: payErr, session_id: session.id })
    }

    return NextResponse.json({
      url:       session.url,
      sessionId: session.id,
    })

  } catch (error) {
    console.error('[checkout/session] Unhandled error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
