/**
 * backfill-sync-visit-metadata.ts — One-off
 *
 * Aligns the manually-created sync visit Stripe Product + Price with
 * the conventions the seed script (seed-stripe-prices.ts) expects:
 *
 *   - Product metadata.service_key = 'sync_visit'
 *   - Product metadata.managed_by  = 'seed-stripe-prices'
 *   - Price lookup_key             = 'service_sync_visit'
 *   - Price metadata.service_key   = 'sync_visit'
 *   - Price metadata.managed_by    = 'seed-stripe-prices'
 *
 * After this script runs once, `npm run seed:prices` will adopt the
 * existing product + price (no duplicates created) and persist a
 * service_pricing row pointing at the existing Price ID.
 *
 * Run:
 *   STRIPE_SECRET_KEY=sk_test_...  npx tsx scripts/backfill-sync-visit-metadata.ts
 */

import 'dotenv/config'
import path from 'node:path'
import { config as dotenvConfig } from 'dotenv'
import Stripe from 'stripe'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if (!STRIPE_SECRET_KEY) {
  console.error('ERROR: STRIPE_SECRET_KEY is not set.')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
  appInfo:    { name: 'PreventiveMD backfill', version: '0.1.0' },
})

// ─── Constants matching pricing-config.ts ──
const PRODUCT_ID    = 'prod_UQbungJ1VTiIC8'
const SERVICE_KEY   = 'sync_visit'
const NEW_LOOKUP    = `service_${SERVICE_KEY}`   // 'service_sync_visit'

async function main() {
  console.log(`\n🔧 Backfilling Stripe metadata for sync visit product ${PRODUCT_ID}\n`)

  // 1. Verify product exists
  const product = await stripe.products.retrieve(PRODUCT_ID)
  console.log(`  Found product: ${product.name} (active=${product.active})`)

  // 2. Update product metadata (preserves any other metadata fields)
  await stripe.products.update(PRODUCT_ID, {
    metadata: {
      ...(product.metadata ?? {}),
      service_key: SERVICE_KEY,
      managed_by:  'seed-stripe-prices',
    },
  })
  console.log(`  ✓ Updated product metadata: service_key=${SERVICE_KEY}, managed_by=seed-stripe-prices`)

  // 3. Find all active prices under this product and align them
  const prices = await stripe.prices.list({
    product: PRODUCT_ID,
    active:  true,
    limit:   10,
  })

  if (prices.data.length === 0) {
    console.warn(`  ⚠️  No active prices found on product ${PRODUCT_ID}`)
  }

  for (const price of prices.data) {
    // If a different active price already holds NEW_LOOKUP we can't
    // assign it directly; transfer_lookup_key will reclaim it.
    await stripe.prices.update(price.id, {
      lookup_key:          NEW_LOOKUP,
      transfer_lookup_key: true,
      metadata: {
        ...(price.metadata ?? {}),
        service_key: SERVICE_KEY,
        managed_by:  'seed-stripe-prices',
      },
    })
    const display = `$${(price.unit_amount ?? 0) / 100}`
    console.log(`  ✓ Updated price ${price.id} (${display}): lookup_key=${NEW_LOOKUP}`)
  }

  console.log('\n✅ Backfill complete.')
  console.log('   Next step: run `npm run seed:prices` to populate service_pricing.\n')
}

main().catch(err => {
  console.error('\n❌ Backfill failed:', err)
  process.exit(1)
})
