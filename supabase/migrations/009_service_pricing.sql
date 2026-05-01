-- ============================================================
-- 009_service_pricing.sql
--
-- Adds the service_pricing table for non-treatment Stripe items
-- (the sync video consultation fee in v1; future: standalone lab
-- panels, annual physicals, re-evaluation visits, etc.).
--
-- Why a separate table from payment_gateway_prices:
--   - payment_gateway_prices is keyed on (formulation, term) — both
--     concepts that don't apply to one-time services.
--   - Loosening that table's NOT NULL constraints would lose
--     query / index ergonomics for the common case (treatments).
--   - Services have a much simpler shape: one Stripe Product, one
--     Price, no recurring interval. Single-row-per-service is clean.
--
-- The seed script (scripts/seed-stripe-prices.ts) populates this
-- table from pricing-config.ts SERVICES alongside the treatment
-- catalog, so a single edit + `npm run seed:prices` updates both.
-- ============================================================

CREATE TABLE service_pricing (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Stable identifier the application code references. Matches the
  -- `service_key` field on pricing-config.ts SERVICES.
  service_key   TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  description   TEXT,

  -- Gateway link
  gateway       TEXT NOT NULL,        -- 'stripe' | future
  external_id   TEXT NOT NULL,        -- 'price_xxx'

  -- Pricing
  unit_amount_cents INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'usd',
  type          TEXT NOT NULL CHECK (type IN ('one_time', 'recurring')),

  -- Lifecycle
  is_active     BOOLEAN NOT NULL DEFAULT true,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ,

  -- One Stripe Price ID can only appear once.
  UNIQUE (gateway, external_id)
);

CREATE INDEX idx_sp_service ON service_pricing(service_key);
CREATE INDEX idx_sp_lookup  ON service_pricing(gateway, external_id);

-- Only one active price per (service, gateway). When the seed
-- script changes a service price, it archives the old row (sets
-- is_active=false + archived_at) before inserting the new one.
CREATE UNIQUE INDEX idx_sp_active
  ON service_pricing(service_key, gateway)
  WHERE is_active = true;

-- ── RLS ──
-- Catalog data — public-read for active rows. Same posture as
-- payment_gateway_prices (migration 008).
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service pricing is viewable by everyone (active only)"
  ON service_pricing FOR SELECT USING (is_active = true);
