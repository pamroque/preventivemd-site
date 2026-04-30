/**
 * stripe/customer.ts — Resolve or create a Stripe Customer for a patient
 *
 * One Stripe Customer per patient, reused across all checkouts. The
 * customer ID is stored in patients.gateway_customer_ids (JSONB):
 *   { "stripe": "cus_xxx" }
 *
 * Why this matters: cards saved during one checkout (via setup_future_usage)
 * are attached to the Stripe Customer. If we created a new Customer per
 * checkout, the saved card would be unreachable next time and the
 * post-visit Treatment Plan flow (Step 3) would have nothing to charge.
 *
 * Server-only. Uses the Supabase admin client (service role).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from './client'

export interface PatientForStripe {
  id:         string
  email:      string
  first_name: string
  last_name:  string
  phone:      string | null
  gateway_customer_ids: Record<string, string> | null
}

/**
 * Returns a Stripe Customer ID for the given patient, creating one if
 * none exists. Persists the new ID back to patients.gateway_customer_ids
 * so subsequent calls are a fast lookup.
 *
 * Idempotency: safe to call from concurrent requests. The Stripe Customer
 * create call uses an idempotency key keyed on patient.id, so two
 * simultaneous calls produce a single Stripe Customer.
 */
export async function getOrCreateStripeCustomer(
  supabase: SupabaseClient,
  patient:  PatientForStripe,
): Promise<string> {
  // Fast path: we already have one
  const existing = patient.gateway_customer_ids?.stripe
  if (existing) return existing

  const stripe = getStripe()

  // Create the Stripe Customer. Idempotency key prevents duplicates if
  // two requests for the same patient race here. The key is bounded by
  // a window — Stripe stores idempotency results for 24h. Within that
  // window the second request returns the original customer.
  const customer = await stripe.customers.create(
    {
      email: patient.email,
      name:  `${patient.first_name} ${patient.last_name}`.trim(),
      phone: patient.phone ?? undefined,
      metadata: {
        // Both directions of the link, so we can find a patient from
        // the Stripe Dashboard and vice versa.
        patient_id: patient.id,
      },
    },
    {
      idempotencyKey: `customer_create_${patient.id}`,
    },
  )

  // Merge into the existing JSONB map so we don't clobber other gateways
  // (square, helcim, etc.) that may be added in the future.
  const merged = {
    ...(patient.gateway_customer_ids ?? {}),
    stripe: customer.id,
  }

  const { error } = await supabase
    .from('patients')
    .update({ gateway_customer_ids: merged })
    .eq('id', patient.id)

  if (error) {
    // The Stripe Customer exists but we couldn't persist the link. This
    // is recoverable — the next call will create a new (orphan) Customer
    // and persist that one. Worth alerting on but not fatal.
    console.error(
      '[stripe/customer] Failed to persist Stripe customer ID',
      { patient_id: patient.id, stripe_customer: customer.id, error },
    )
  }

  return customer.id
}
