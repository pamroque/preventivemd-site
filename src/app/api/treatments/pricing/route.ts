/**
 * GET /api/treatments/pricing — Public price catalog
 *
 * Returns:
 *   1. `treatments` — active subscription products (treatments × formulations
 *      × terms × amount), sourced from payment_gateway_prices in Supabase.
 *   2. `services` — non-treatment one-time prices like the sync visit fee,
 *      sourced from Stripe Price objects directly (since they don't fit the
 *      treatment_formulations data model).
 *
 * The UI uses this in place of any hardcoded prices so a price change is
 * one edit + one seed run (or one Dashboard edit for services), no UI deploy.
 *
 * Response shape:
 *   {
 *     currency: 'usd',
 *     treatments: {
 *       semaglutide: {
 *         name: 'Semaglutide',
 *         formulations: {
 *           injection: { label: 'Injection', prices: { '1mo': 14900, ... } },
 *           oral:      { label: 'Oral',      prices: { '1mo': 14900, ... } }
 *         }
 *       },
 *       ...
 *     },
 *     services: {
 *       sync_visit: {
 *         name: 'Sync Video Consultation',
 *         amount_cents: 3500,
 *         currency: 'usd',
 *         type: 'one_time'
 *       }
 *     }
 *   }
 *
 * Caching: revalidates every 5 minutes via Next.js ISR. A pricing change
 * goes live the first time the page is hit after revalidation.
 *
 * Filters: only is_active rows from treatments / treatment_formulations /
 * payment_gateway_prices (and gateway='stripe').
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Force dynamic rendering — never prerender at build time. ISR-style
// `revalidate` would attempt a build-time render of this route, which
// fails in CI without DB env vars. We get caching via HTTP headers
// (s-maxage + stale-while-revalidate) instead — Vercel + browsers
// cache the response identically to ISR with way fewer surprises.
export const dynamic = 'force-dynamic'


// ─── Response shape ──────────────────────────────────────────────────────────

interface PriceMap {
  [term: string]: number  // amount_cents
}

interface FormulationEntry {
  label:  string
  prices: PriceMap
}

interface TreatmentEntry {
  name:         string
  formulations: Record<string, FormulationEntry>
}

interface ServiceEntry {
  name:         string
  amount_cents: number
  currency:     string
  type:         'one_time' | 'recurring'
}

interface PricingResponse {
  currency:   string
  treatments: Record<string, TreatmentEntry>
  services:   Record<string, ServiceEntry>
}


// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = createAdminClient()

  // One JOIN-y query that pulls the whole active catalog. The rows come
  // back denormalized; we fold them into the nested response shape below.
  const { data, error } = await supabase
    .from('payment_gateway_prices')
    .select(`
      term,
      unit_amount_cents,
      currency,
      treatment_formulations!inner (
        formulation,
        display_label,
        is_active,
        treatments!inner (
          slug,
          name,
          is_active
        )
      )
    `)
    .eq('gateway', 'stripe')
    .eq('is_active', true)

  if (error) {
    console.error('[treatments/pricing] Query failed', error)
    return NextResponse.json({ error: 'Failed to load pricing' }, { status: 500 })
  }

  // Filter to active treatments + formulations and fold into nested shape.
  const response: PricingResponse = {
    currency:   'usd',
    treatments: {},
    services:   {},
  }

  // Supabase's typegen treats nested joins as arrays; cast through unknown
  // because we know each !inner join produces exactly one matching row.
  type PriceRow = {
    term:               string
    unit_amount_cents:  number
    currency:           string
    treatment_formulations: {
      formulation:    string
      display_label:  string
      is_active:      boolean
      treatments: {
        slug:       string
        name:       string
        is_active:  boolean
      }
    }
  }

  for (const row of ((data ?? []) as unknown) as PriceRow[]) {
    const tf = row.treatment_formulations
    const t  = tf.treatments
    if (!t.is_active || !tf.is_active) continue

    if (!response.treatments[t.slug]) {
      response.treatments[t.slug] = {
        name:         t.name,
        formulations: {},
      }
    }
    const treatmentEntry = response.treatments[t.slug]

    if (!treatmentEntry.formulations[tf.formulation]) {
      treatmentEntry.formulations[tf.formulation] = {
        label:  tf.display_label,
        prices: {},
      }
    }
    treatmentEntry.formulations[tf.formulation].prices[row.term] = row.unit_amount_cents
  }

  // ── Services (sync visit fee, future standalone items) ──
  // Read from service_pricing — same source-of-truth pattern as treatments
  // (seed script populates from pricing-config.ts → Stripe → Supabase).
  // No live Stripe API call at request time.
  const { data: services, error: servicesErr } = await supabase
    .from('service_pricing')
    .select('service_key, display_name, unit_amount_cents, currency, type')
    .eq('gateway', 'stripe')
    .eq('is_active', true)

  if (servicesErr) {
    console.warn('[treatments/pricing] services query failed', servicesErr)
  } else {
    for (const svc of (services ?? []) as Array<{
      service_key:       string
      display_name:      string
      unit_amount_cents: number
      currency:          string
      type:              string
    }>) {
      response.services[svc.service_key] = {
        name:         svc.display_name,
        amount_cents: svc.unit_amount_cents,
        currency:     svc.currency,
        type:         svc.type === 'recurring' ? 'recurring' : 'one_time',
      }
    }
  }

  return NextResponse.json(response, {
    headers: {
      // CDN cache for 5 minutes; serve stale while revalidating in the
      // background for an extra 10 minutes. Equivalent caching benefit
      // to ISR `revalidate=300` without forcing build-time prerender.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
