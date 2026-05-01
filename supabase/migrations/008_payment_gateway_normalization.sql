-- ============================================================
-- 008_payment_gateway_normalization.sql
--
-- Replaces JSON-blob gateway data with properly normalized,
-- integration-agnostic tables.
--
-- Design principles:
--   1. Gateway-agnostic — every table has a `gateway` discriminator,
--      so adding Square / Helcim / etc. is INSERT rows, not migrations.
--   2. No JSON for queryable structure — typed columns + UNIQUE
--      constraints + indexes for everything we'd want to filter or join.
--   3. JSONB only for truly heterogeneous data (per-gateway metadata).
--
-- What this migration does:
--   1. Creates treatment_formulations — catalog rows for each
--      (treatment, formulation) pair (one Stripe Product per row).
--   2. Creates payment_gateway_customers, payment_gateway_products,
--      payment_gateway_prices — generic per-gateway link tables.
--   3. Drops patients.gateway_customer_ids (JSONB, replaced).
--   4. Drops treatments.gateway_prices (JSONB, replaced).
--   5. Archives the 8 unsold treatments (sets is_active=false).
--   6. RLS: catalog tables are public-read, payment_gateway_customers
--      is service-role-only (links to PHI).
--
-- Re-running the seed script (scripts/seed-stripe-prices.ts) after this
-- migration repopulates the new tables. Must be done before the next
-- payment is taken — the API resolver depends on the new tables.
-- ============================================================


-- ── 1. treatment_formulations ────────────────────────────────
-- One row per (treatment, formulation). Each row maps 1:1 to a
-- Stripe Product (and equivalents in other gateways).
CREATE TABLE treatment_formulations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_id  UUID NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,

  -- 'injection' | 'oral' | 'sublingual' | future formulations.
  formulation   TEXT NOT NULL,
  display_label TEXT NOT NULL,

  is_active     BOOLEAN NOT NULL DEFAULT true,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ,

  UNIQUE (treatment_id, formulation)
);

CREATE INDEX idx_tf_treatment ON treatment_formulations(treatment_id);
CREATE INDEX idx_tf_active    ON treatment_formulations(is_active)
  WHERE is_active = true;

CREATE TRIGGER trg_tf_updated
  BEFORE UPDATE ON treatment_formulations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. payment_gateway_customers ────────────────────────────
-- Links a patient to their external customer ID at each payment
-- gateway. One row per (patient, gateway). Replaces the JSONB
-- patients.gateway_customer_ids that 007 introduced.
CREATE TABLE payment_gateway_customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  gateway       TEXT NOT NULL,         -- 'stripe' | 'square' | 'helcim' | future
  external_id   TEXT NOT NULL,         -- 'cus_xxx' for stripe

  -- Per-gateway extras that don't deserve their own column. Optional.
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A patient has exactly one customer record per gateway.
  UNIQUE (patient_id, gateway)
);

CREATE INDEX idx_pgc_patient ON payment_gateway_customers(patient_id);
CREATE INDEX idx_pgc_lookup  ON payment_gateway_customers(gateway, external_id);


-- ── 3. payment_gateway_products ─────────────────────────────
-- Links a treatment_formulation row to its external Product ID at
-- each payment gateway.
CREATE TABLE payment_gateway_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  formulation_id  UUID NOT NULL REFERENCES treatment_formulations(id) ON DELETE CASCADE,

  gateway         TEXT NOT NULL,
  external_id     TEXT NOT NULL,        -- 'prod_xxx'

  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (formulation_id, gateway)
);

CREATE INDEX idx_pgprod_formulation ON payment_gateway_products(formulation_id);
CREATE INDEX idx_pgprod_lookup      ON payment_gateway_products(gateway, external_id);


-- ── 4. payment_gateway_prices ───────────────────────────────
-- Per-(formulation, term, gateway) Price object. Each row is one
-- Stripe Price (or equivalent). Stripe Prices are immutable in the
-- gateway, so when a price changes we INSERT a new row and set
-- archived_at on the old one.
CREATE TABLE payment_gateway_prices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  formulation_id    UUID NOT NULL REFERENCES treatment_formulations(id) ON DELETE CASCADE,

  term              TEXT NOT NULL,        -- '1mo' | '3mo' | '6mo' | '12mo'
  gateway           TEXT NOT NULL,
  external_id       TEXT NOT NULL,        -- 'price_xxx'

  -- Stable cross-environment identifier. In Stripe this is the
  -- lookup_key; in another gateway it might be different. Optional
  -- because not every gateway supports it.
  lookup_key        TEXT,

  unit_amount_cents INTEGER NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'usd',

  -- The seed script flips is_active=false + sets archived_at when
  -- a price changes (so historical reporting still works).
  is_active         BOOLEAN NOT NULL DEFAULT true,

  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at       TIMESTAMPTZ,

  -- We can have multiple prices for the same (formulation, term,
  -- gateway) over time; only one should be active at a time. The
  -- partial unique index below enforces that.
  UNIQUE (gateway, external_id)
);

CREATE INDEX idx_pgprice_formulation
  ON payment_gateway_prices(formulation_id);
CREATE INDEX idx_pgprice_lookup_key
  ON payment_gateway_prices(lookup_key)
  WHERE lookup_key IS NOT NULL;

-- Only one active price per (formulation, term, gateway). The
-- seed script must archive (is_active=false) the old one before
-- inserting a new active one.
CREATE UNIQUE INDEX idx_pgprice_active_unique
  ON payment_gateway_prices(formulation_id, term, gateway)
  WHERE is_active = true;


-- ── 5. Drop the JSON columns we're replacing ────────────────
-- These were introduced in migration 007 and are now superseded
-- by the typed tables above.
DROP INDEX IF EXISTS idx_patients_gateway_cust;
DROP INDEX IF EXISTS idx_treatments_gateway_prices;

ALTER TABLE patients   DROP COLUMN IF EXISTS gateway_customer_ids;
ALTER TABLE treatments DROP COLUMN IF EXISTS gateway_prices;


-- ── 6. Archive unsold treatments ────────────────────────────
-- Migration 001 seeded 14 treatments; we currently sell 6. Mark
-- the rest is_active=false so the questionnaire UI can filter them
-- out without losing the rows (in case we sell them later).
UPDATE treatments
SET is_active = false
WHERE slug NOT IN (
  'semaglutide',
  'tirzepatide',
  'ghk-cu',
  'nad-plus',
  'sermorelin',
  'glutathione'
);


-- ── 7. Row-Level Security ───────────────────────────────────

-- Catalog tables are public-read (same posture as the existing
-- `treatments` table). The actual price values aren't sensitive
-- and customers benefit from being able to see them client-side.
ALTER TABLE treatment_formulations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateway_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateway_prices    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Treatment formulations are viewable by everyone"
  ON treatment_formulations FOR SELECT USING (true);

CREATE POLICY "Payment gateway products are viewable by everyone"
  ON payment_gateway_products FOR SELECT USING (true);

CREATE POLICY "Payment gateway prices are viewable by everyone (active only)"
  ON payment_gateway_prices FOR SELECT USING (is_active = true);

-- payment_gateway_customers links a patient to a Stripe customer ID;
-- that's PHI-adjacent. Service-role only — same posture as
-- ehr_external_ids and ehr_sync_jobs (migration 003).
ALTER TABLE payment_gateway_customers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payment_gateway_customers FROM anon, authenticated;
