/**
 * seed-stripe-prices.ts — Reflect the pricing config to Stripe + Supabase
 *
 * IDEMPOTENT. Safe to run repeatedly. Run after editing pricing-config.ts.
 *
 *   STRIPE_SECRET_KEY=sk_test_...  npx tsx scripts/seed-stripe-prices.ts
 *
 * What it does:
 *   1. Ensures every (treatment, formulation) pair from the config has a row
 *      in `treatments` and `treatment_formulations`.
 *   2. For each formulation: finds an existing Stripe Product (matched by
 *      metadata.slug + metadata.formulation) or creates one. Persists the
 *      product ID to `payment_gateway_products`.
 *   3. For each (formulation, term): finds an existing active Stripe Price
 *      (matched by lookup_key) or creates one. Stripe Prices are immutable
 *      — if amount or interval changed, archive old + create new. Persists
 *      to `payment_gateway_prices`.
 *
 * Re-run is safe: existing rows are reused. Only changed prices produce
 * new Stripe + Supabase objects. Old prices stay archived for historical
 * reporting and grandfathered subscriptions.
 */

import 'dotenv/config'
import path from 'node:path'
import { config as dotenvConfig } from 'dotenv'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  TREATMENTS,
  FORMULATIONS,
  TERMS,
  SERVICES,
  productName,
  lookupKey,
  serviceLookupKey,
  type TreatmentDefinition,
  type TermDefinition,
  type ServiceDefinition,
} from './pricing-config'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

// ─── Setup ──────────────────────────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if (!STRIPE_SECRET_KEY) {
  console.error('ERROR: STRIPE_SECRET_KEY is not set. Add it to .env.local or pass via env.')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Supabase env vars not set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
  appInfo:    { name: 'PreventiveMD seed', version: '0.1.0' },
})

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const isLiveMode = STRIPE_SECRET_KEY.startsWith('sk_live_')
const GATEWAY = 'stripe'


// ─── 1. Ensure treatment + formulation rows exist ───────────────────────────

async function ensureTreatmentRow(t: TreatmentDefinition): Promise<string> {
  const { data: existing } = await supabase
    .from('treatments')
    .select('id')
    .eq('slug', t.slug)
    .maybeSingle()

  if (existing) return existing.id

  // Special-case nad → nad-plus rename. Migration 001 seeded slug='nad' but
  // the questionnaire uses 'nad-plus'. Rename in place rather than create
  // a duplicate row.
  if (t.slug === 'nad-plus') {
    const { data: nadRow } = await supabase
      .from('treatments')
      .select('id')
      .eq('slug', 'nad')
      .maybeSingle()
    if (nadRow) {
      await supabase.from('treatments').update({ slug: 'nad-plus' }).eq('id', nadRow.id)
      console.log(`  ↻ renamed treatment row nad → nad-plus`)
      return nadRow.id
    }
  }

  const { data: created, error } = await supabase
    .from('treatments')
    .insert({
      slug:     t.slug,
      name:     t.display_name,
      category: 'peptide',
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create treatment row for ${t.slug}: ${error?.message}`)
  }
  console.log(`  + created treatment row for ${t.slug}`)
  return created.id
}

async function ensureFormulationRow(
  treatmentRowId: string,
  treatmentSlug:  string,
  formulationId:  string,
): Promise<string> {
  const formulation = FORMULATIONS.find(f => f.id === formulationId)
  if (!formulation) throw new Error(`Unknown formulation: ${formulationId}`)

  const { data: existing } = await supabase
    .from('treatment_formulations')
    .select('id')
    .eq('treatment_id', treatmentRowId)
    .eq('formulation', formulationId)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('treatment_formulations')
    .insert({
      treatment_id:  treatmentRowId,
      formulation:   formulationId,
      display_label: formulation.label,
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create formulation row for ${treatmentSlug}/${formulationId}: ${error?.message}`)
  }
  console.log(`    + created formulation row ${treatmentSlug}/${formulationId}`)
  return created.id
}


// ─── 2. Ensure Stripe Product + payment_gateway_products row ────────────────

async function ensureProduct(
  formulationRowId: string,
  treatment:        TreatmentDefinition,
  formulationId:    string,
): Promise<string> {
  const name = productName(treatment, formulationId)

  // Existing payment_gateway_products row?
  const { data: existingRow } = await supabase
    .from('payment_gateway_products')
    .select('external_id')
    .eq('formulation_id', formulationRowId)
    .eq('gateway', GATEWAY)
    .maybeSingle()

  if (existingRow) {
    // Verify the Stripe Product still exists + matches our spec.
    const product = await stripe.products.retrieve(existingRow.external_id)
    if (product.active && product.name === name) {
      console.log(`    = product ${product.id} (${name})`)
      return product.id
    }
    if (product.active) {
      // Drift: name or description out of date — update in place.
      await stripe.products.update(product.id, { name, description: treatment.description })
      console.log(`    ↻ updated product ${product.id} (${name})`)
      return product.id
    }
    // Product was archived in Stripe; fall through to create a new one.
  }

  // Search Stripe by metadata as a defensive last resort (covers cases
  // where the Supabase row was lost but the Stripe Product still exists).
  const found = await stripe.products.search({
    query: `active:'true' AND metadata['slug']:'${treatment.slug}' AND metadata['formulation']:'${formulationId}'`,
    limit: 1,
  })

  let productId: string
  if (found.data.length > 0) {
    const product = found.data[0]
    if (product.name !== name || product.description !== (treatment.description ?? null)) {
      await stripe.products.update(product.id, { name, description: treatment.description })
      console.log(`    ↻ adopted + updated product ${product.id} (${name})`)
    } else {
      console.log(`    = adopted product ${product.id} (${name})`)
    }
    productId = product.id
  } else {
    const product = await stripe.products.create({
      name,
      description: treatment.description,
      metadata: {
        slug:        treatment.slug,
        formulation: formulationId,
        managed_by:  'seed-stripe-prices',
      },
      tax_code: 'txcd_99999999',
    })
    console.log(`    + created product ${product.id} (${name})`)
    productId = product.id
  }

  // Upsert into payment_gateway_products.
  const { error } = await supabase
    .from('payment_gateway_products')
    .upsert(
      {
        formulation_id: formulationRowId,
        gateway:        GATEWAY,
        external_id:    productId,
        metadata: {
          slug:        treatment.slug,
          formulation: formulationId,
        },
      },
      { onConflict: 'formulation_id,gateway' },
    )

  if (error) {
    throw new Error(`Failed to upsert payment_gateway_products row: ${error.message}`)
  }

  return productId
}


// ─── 3. Ensure Stripe Price + payment_gateway_prices row ────────────────────

function priceMatchesSpec(price: Stripe.Price, term: TermDefinition): boolean {
  return (
    !!price.active &&
    price.unit_amount === term.amount_cents &&
    price.currency === 'usd' &&
    price.recurring?.interval === term.interval &&
    price.recurring?.interval_count === term.interval_count
  )
}

async function insertPriceRow(
  formulationRowId: string,
  treatmentSlug:    string,
  formulationId:    string,
  term:             TermDefinition,
  price:            Stripe.Price,
  lk:               string,
): Promise<void> {
  const { error } = await supabase
    .from('payment_gateway_prices')
    .insert({
      formulation_id:    formulationRowId,
      term:              term.id,
      gateway:           GATEWAY,
      external_id:       price.id,
      lookup_key:        lk,
      unit_amount_cents: term.amount_cents,
      currency:          'usd',
      is_active:         true,
      metadata: {
        slug:        treatmentSlug,
        formulation: formulationId,
        term:        term.id,
      },
    })
  if (error) {
    throw new Error(`Failed to insert payment_gateway_prices row: ${error.message}`)
  }
}

async function ensurePrice(
  formulationRowId:  string,
  productId:         string,
  treatmentSlug:     string,
  formulationId:     string,
  term:              TermDefinition,
): Promise<void> {
  const lk = lookupKey(treatmentSlug, formulationId, term.id)

  // ── Step 1: DB-first check ──
  // If we already track an active price for this (formulation, term, gateway),
  // verify it still matches the config and either reuse or archive+recreate.
  const { data: activeRow } = await supabase
    .from('payment_gateway_prices')
    .select('id, external_id')
    .eq('formulation_id', formulationRowId)
    .eq('term', term.id)
    .eq('gateway', GATEWAY)
    .eq('is_active', true)
    .maybeSingle()

  if (activeRow) {
    const price = await stripe.prices.retrieve(activeRow.external_id)
    if (priceMatchesSpec(price, term)) {
      console.log(`      = price ${price.id} (${lk}) $${term.amount_cents / 100}`)
      return
    }
    console.log(`      ↻ archiving price ${price.id} (spec changed)`)
    await stripe.prices.update(price.id, {
      lookup_key: `${lk}_archived_${Date.now()}`,
      active:     false,
    })
    await supabase
      .from('payment_gateway_prices')
      .update({ is_active: false, archived_at: new Date().toISOString() })
      .eq('id', activeRow.id)
  }

  // ── Step 2: Stripe-first adoption ──
  // DB has no active record. Before creating a new Stripe Price, check
  // whether a previous seed run already created one with this lookup_key
  // (e.g., DB was wiped by a migration). Adopt it instead of duplicating.
  const byLookup = await stripe.prices.list({
    lookup_keys: [lk],
    active:      true,
    limit:       1,
  })

  if (byLookup.data.length > 0) {
    const existingPrice = byLookup.data[0]
    if (priceMatchesSpec(existingPrice, term)) {
      await insertPriceRow(formulationRowId, treatmentSlug, formulationId, term, existingPrice, lk)
      console.log(`      = adopted price ${existingPrice.id} (${lk}) $${term.amount_cents / 100}`)
      return
    }
    // Lookup key collides with a price that doesn't match spec — archive it
    // (transfer_lookup_key on the new price will reclaim the key automatically).
    console.log(`      ↻ archiving stale price ${existingPrice.id} (lookup key collision, spec mismatch)`)
    await stripe.prices.update(existingPrice.id, {
      lookup_key: `${lk}_archived_${Date.now()}`,
      active:     false,
    })
  }

  // ── Step 3: Create fresh ──
  const price = await stripe.prices.create({
    product:     productId,
    currency:    'usd',
    unit_amount: term.amount_cents,
    recurring: {
      interval:       term.interval,
      interval_count: term.interval_count,
    },
    lookup_key:           lk,
    transfer_lookup_key:  true,
    nickname:             term.label,
    metadata: {
      slug:        treatmentSlug,
      formulation: formulationId,
      term:        term.id,
      managed_by:  'seed-stripe-prices',
    },
  })

  await insertPriceRow(formulationRowId, treatmentSlug, formulationId, term, price, lk)
  console.log(`      + created price ${price.id} (${lk}) $${term.amount_cents / 100}`)
}


// ─── 4. Seed services (non-treatment Stripe items) ──────────────────────────
// Each SERVICES entry maps to one Stripe Product + one Price (one-time
// for sync visit; recurring is supported in the data model for future
// services). Persists to the service_pricing table from migration 009.

function serviceMatchesSpec(price: Stripe.Price, svc: ServiceDefinition): boolean {
  if (!price.active) return false
  if (price.unit_amount !== svc.amount_cents) return false
  if (price.currency !== svc.currency) return false
  if (svc.type === 'one_time')  return !price.recurring
  if (svc.type === 'recurring') return !!price.recurring
  return false
}

async function ensureServiceProduct(svc: ServiceDefinition): Promise<string> {
  const lk = serviceLookupKey(svc.service_key)

  // Strategy 1: lookup by Price.lookup_key — indexed and immediate, no lag.
  // If a Price with this lookup_key already exists, walk to its Product and
  // adopt that. This is the most reliable path for re-runs.
  const byPriceLookup = await stripe.prices.list({
    lookup_keys: [lk],
    active:      true,
    limit:       1,
  })
  if (byPriceLookup.data.length > 0) {
    const productRef = byPriceLookup.data[0].product
    const productId = typeof productRef === 'string' ? productRef : productRef.id
    const product = await stripe.products.retrieve(productId)
    if (product.active) {
      const wantMeta = {
        ...(product.metadata ?? {}),
        service_key: svc.service_key,
        managed_by:  'seed-stripe-prices',
      }
      const metaDrift =
        product.metadata?.service_key !== svc.service_key ||
        product.metadata?.managed_by  !== 'seed-stripe-prices'
      const nameDrift =
        product.name !== svc.display_name ||
        product.description !== (svc.description ?? null)

      if (metaDrift || nameDrift) {
        await stripe.products.update(product.id, {
          name:        svc.display_name,
          description: svc.description,
          metadata:    wantMeta,
        })
        console.log(`    ↻ adopted + updated product ${product.id} (via existing price)`)
      } else {
        console.log(`    = adopted product ${product.id} (via existing price)`)
      }
      return product.id
    }
  }

  // Strategy 2: search by metadata — has indexing lag of seconds to minutes
  // after a metadata write, but works for cases with no existing price.
  const found = await stripe.products.search({
    query: `active:'true' AND metadata['service_key']:'${svc.service_key}'`,
    limit: 1,
  })

  if (found.data.length > 0) {
    const product = found.data[0]
    if (product.name !== svc.display_name || product.description !== (svc.description ?? null)) {
      await stripe.products.update(product.id, {
        name:        svc.display_name,
        description: svc.description,
      })
      console.log(`    ↻ updated product ${product.id} (via metadata search)`)
    } else {
      console.log(`    = adopted product ${product.id} (via metadata search)`)
    }
    return product.id
  }

  // Strategy 3: nothing found anywhere — create fresh.
  const product = await stripe.products.create({
    name:        svc.display_name,
    description: svc.description,
    metadata: {
      service_key: svc.service_key,
      managed_by:  'seed-stripe-prices',
    },
    tax_code: 'txcd_99999999',
  })
  console.log(`    + created product ${product.id} (${svc.display_name})`)
  return product.id
}

async function ensureServicePrice(productId: string, svc: ServiceDefinition): Promise<Stripe.Price> {
  const lk = serviceLookupKey(svc.service_key)

  // Stripe-first adoption: lookup by lookup_key.
  const existing = await stripe.prices.list({
    lookup_keys: [lk],
    active:      true,
    limit:       1,
  })

  if (existing.data.length > 0 && serviceMatchesSpec(existing.data[0], svc)) {
    console.log(`    = price ${existing.data[0].id} (${lk}) $${svc.amount_cents / 100}`)
    return existing.data[0]
  }

  // Archive stale active price if any.
  if (existing.data.length > 0) {
    console.log(`    ↻ archiving stale price ${existing.data[0].id} (spec mismatch)`)
    await stripe.prices.update(existing.data[0].id, {
      lookup_key: `${lk}_archived_${Date.now()}`,
      active:     false,
    })
  }

  const price = await stripe.prices.create({
    product:     productId,
    currency:    svc.currency,
    unit_amount: svc.amount_cents,
    // No `recurring` for one-time. For 'recurring' services in the future,
    // we'd add interval here — intentionally not v1.
    lookup_key:           lk,
    transfer_lookup_key:  true,
    nickname:             svc.display_name,
    metadata: {
      service_key: svc.service_key,
      managed_by:  'seed-stripe-prices',
    },
  })

  console.log(`    + created price ${price.id} (${lk}) $${svc.amount_cents / 100}`)
  return price
}

async function persistServicePricing(svc: ServiceDefinition, price: Stripe.Price): Promise<void> {
  // Look up an existing active row.
  const { data: existing } = await supabase
    .from('service_pricing')
    .select('id, external_id')
    .eq('service_key', svc.service_key)
    .eq('gateway', GATEWAY)
    .eq('is_active', true)
    .maybeSingle()

  if (existing && existing.external_id === price.id) {
    console.log(`    ✓ service_pricing already current`)
    return
  }

  // Active row points at a different Stripe Price — archive it.
  if (existing) {
    await supabase
      .from('service_pricing')
      .update({ is_active: false, archived_at: new Date().toISOString() })
      .eq('id', existing.id)
    console.log(`    ↓ archived stale service_pricing row`)
  }

  const { error } = await supabase
    .from('service_pricing')
    .insert({
      service_key:       svc.service_key,
      display_name:      svc.display_name,
      description:       svc.description,
      gateway:           GATEWAY,
      external_id:       price.id,
      unit_amount_cents: svc.amount_cents,
      currency:          svc.currency,
      type:              svc.type,
      is_active:         true,
      metadata: {
        managed_by: 'seed-stripe-prices',
      },
    })

  if (error) {
    throw new Error(`Failed to insert service_pricing row for ${svc.service_key}: ${error.message}`)
  }
  console.log(`    ✓ persisted service_pricing row`)
}

async function seedServices(): Promise<void> {
  if (SERVICES.length === 0) return

  for (const svc of SERVICES) {
    console.log(`\n🛎️  ${svc.display_name} (${svc.service_key})`)
    const productId = await ensureServiceProduct(svc)
    const price     = await ensureServicePrice(productId, svc)
    await persistServicePricing(svc, price)
  }
}


// ─── 5. Cleanup pass — archive orphan Stripe Prices not in our DB ───────────
// Run after the main seed loop. Finds all active Stripe Prices that the seed
// script created (managed_by='seed-stripe-prices') but that aren't referenced
// by any payment_gateway_prices row. These are leftover duplicates from
// earlier runs (e.g., when migration 008 wiped the JSONB column and the next
// seed created new prices instead of adopting the existing ones).
//
// SAFETY: only archives prices we created (managed_by tag). Manually-created
// prices (like the $35 sync_visit_fee) are never touched. Active subscriptions
// referencing these orphans would still bill correctly — archiving a Price in
// Stripe doesn't cancel subscriptions, it just removes it from new checkouts.
async function cleanupOrphans(): Promise<number> {
  let archivedCount = 0
  let page: string | undefined = undefined

  do {
    const result: Stripe.ApiSearchResult<Stripe.Price> = await stripe.prices.search({
      query: `active:'true' AND metadata['managed_by']:'seed-stripe-prices'`,
      limit: 100,
      page,
    })

    for (const price of result.data) {
      // Canonical treatment price?
      const { data: trackedTreatment } = await supabase
        .from('payment_gateway_prices')
        .select('id')
        .eq('gateway', GATEWAY)
        .eq('external_id', price.id)
        .eq('is_active', true)
        .maybeSingle()
      if (trackedTreatment) continue

      // Canonical service price?
      const { data: trackedService } = await supabase
        .from('service_pricing')
        .select('id')
        .eq('gateway', GATEWAY)
        .eq('external_id', price.id)
        .eq('is_active', true)
        .maybeSingle()
      if (trackedService) continue

      // Orphan — archive it. Strip the lookup key first so it doesn't
      // collide with a future canonical price.
      const oldLookup = price.lookup_key ?? '(none)'
      await stripe.prices.update(price.id, {
        lookup_key: `orphan_${Date.now()}_${price.id.slice(-8)}`,
        active:     false,
      })
      console.log(`  ↓ archived orphan ${price.id} (was ${oldLookup})`)
      archivedCount++
    }

    page = result.has_more ? result.next_page ?? undefined : undefined
  } while (page)

  return archivedCount
}


// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔧 Seeding Stripe ${isLiveMode ? 'LIVE' : 'TEST'} mode catalog\n`)

  if (isLiveMode) {
    console.log('⚠️  LIVE MODE — this creates real Products/Prices customers will see.')
    console.log('   Cancel within 5 seconds if this is not what you want.\n')
    await new Promise(r => setTimeout(r, 5000))
  }

  for (const treatment of TREATMENTS) {
    console.log(`\n📦 ${treatment.display_name} (${treatment.slug})`)
    const treatmentRowId = await ensureTreatmentRow(treatment)

    for (const formulationId of treatment.formulations) {
      const formulationRowId = await ensureFormulationRow(
        treatmentRowId,
        treatment.slug,
        formulationId,
      )

      const productId = await ensureProduct(formulationRowId, treatment, formulationId)

      for (const term of TERMS) {
        await ensurePrice(formulationRowId, productId, treatment.slug, formulationId, term)
      }
    }
  }

  // Seed services (non-treatment Stripe items) AFTER the treatments loop so
  // the cleanup pass can recognize service prices as canonical (not orphan).
  await seedServices()

  console.log('\n🧹 Cleanup pass — archiving orphan Stripe prices not tracked in DB...')
  const archived = await cleanupOrphans()
  if (archived === 0) {
    console.log('  (none found)')
  } else {
    console.log(`  ✓ Archived ${archived} orphan price(s)`)
  }

  console.log('\n✅ Seed complete.\n')
}

main().catch(err => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
