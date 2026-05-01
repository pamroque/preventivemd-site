/**
 * stripe/customer.ts — Resolve or create a Stripe Customer for a patient
 *
 * One Stripe Customer per patient, reused across all checkouts. The
 * (patient ↔ external customer) link lives in the
 * payment_gateway_customers table:
 *
 *   payment_gateway_customers (patient_id, gateway, external_id)
 *
 * Why this matters: cards saved during one checkout (via
 * setup_future_usage) are attached to the Stripe Customer. If we
 * created a new Customer per checkout, the saved card would be
 * unreachable next time and the post-visit Treatment Plan flow
 * (Step 3) would have nothing to charge.
 *
 * Server-only. Uses the Supabase admin client (service role) since
 * payment_gateway_customers is service-role-only by RLS.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from './client'

const GATEWAY = 'stripe'

export interface PatientForStripe {
  id:         string
  email:      string
  first_name: string
  last_name:  string
  phone:      string | null
}

/**
 * Returns a Stripe Customer ID for the given patient, creating one
 * if no link exists in payment_gateway_customers. Persists the new
 * link so subsequent calls are a fast SELECT.
 *
 * Idempotency: safe to call from concurrent requests. The Stripe
 * Customer create call uses an idempotency key keyed on patient.id;
 * the (patient_id, gateway) UNIQUE constraint on the link table
 * catches any race that survives Stripe's idempotency window.
 */
export async function getOrCreateStripeCustomer(
  supabase: SupabaseClient,
  patient:  PatientForStripe,
): Promise<string> {
  // Fast path: link already exists.
  const { data: existing } = await supabase
    .from('payment_gateway_customers')
    .select('external_id')
    .eq('patient_id', patient.id)
    .eq('gateway', GATEWAY)
    .maybeSingle()

  if (existing?.external_id) return existing.external_id

  const stripe = getStripe()

  const customer = await stripe.customers.create(
    {
      email: patient.email,
      name:  `${patient.first_name} ${patient.last_name}`.trim(),
      phone: patient.phone ?? undefined,
      metadata: {
        patient_id: patient.id,
      },
    },
    {
      idempotencyKey: `customer_create_${patient.id}`,
    },
  )

  // Insert the link. If a concurrent request beat us to it (unique
  // constraint violation on patient_id+gateway), re-query and return
  // the value the other request inserted. Net result: at most one
  // Stripe Customer is referenced per patient even under contention.
  const { error: insertErr } = await supabase
    .from('payment_gateway_customers')
    .insert({
      patient_id:  patient.id,
      gateway:     GATEWAY,
      external_id: customer.id,
    })

  if (insertErr) {
    // 23505 = unique_violation
    if ((insertErr as { code?: string }).code === '23505') {
      const { data: raceWinner } = await supabase
        .from('payment_gateway_customers')
        .select('external_id')
        .eq('patient_id', patient.id)
        .eq('gateway', GATEWAY)
        .single()
      if (raceWinner?.external_id) return raceWinner.external_id
    }
    console.error(
      '[stripe/customer] Failed to persist Stripe customer link',
      { patient_id: patient.id, stripe_customer: customer.id, error: insertErr },
    )
    // Stripe Customer was created — return its ID so the caller can
    // proceed. The link isn't persisted, so a later call will create
    // an orphan. Worth alerting on but not fatal in the current request.
  }

  return customer.id
}
