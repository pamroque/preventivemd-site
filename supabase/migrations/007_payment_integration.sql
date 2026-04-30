-- ============================================================
-- 007_payment_integration.sql
--
-- Adds the Stripe payment integration plumbing on top of the
-- existing gateway-agnostic payments/subscriptions tables.
--
-- Design principles (consistent with 001 and 003):
--   1. Stay gateway-agnostic. No "stripe_*" columns on existing
--      tables — extend the gateway_* fields that already exist.
--   2. Additive only. No changes to existing rows or policies.
--   3. Service-role-only system tables (stripe_events) follow
--      the same RLS posture as ehr_external_ids / ehr_sync_jobs.
--
-- What this migration adds:
--   1. patients.gateway_customer_ids
--      JSONB map { "stripe": "cus_xxx" }. Lets us reuse the same
--      Stripe Customer across checkouts so saved cards persist.
--
--   2. treatments.gateway_prices
--      JSONB map { "stripe": { "monthly": "price_xxx", ... } }.
--      Resolves (treatment_slug, term) → Stripe Price at the
--      moment we build a Checkout Session.
--
--   3. subscriptions.gateway_price_id
--      Denormalized Price ID column for indexing and reporting.
--
--   4. stripe_events
--      Webhook idempotency table. Stripe delivers at-least-once;
--      we dedupe on event.id and record success/failure.
-- ============================================================


-- ── 1. patients.gateway_customer_ids ─────────────────────────
-- Map of gateway name → external customer ID.
-- Example: { "stripe": "cus_PqA7..." }
-- We always look up via this column before creating a new
-- Stripe Customer; if a key is present we reuse the ID.
ALTER TABLE patients
  ADD COLUMN gateway_customer_ids JSONB NOT NULL DEFAULT '{}'::jsonb;

-- GIN index supports queries like
--   WHERE gateway_customer_ids ? 'stripe'
--   WHERE gateway_customer_ids @> '{"stripe": "cus_xxx"}'
CREATE INDEX idx_patients_gateway_cust
  ON patients USING GIN (gateway_customer_ids);


-- ── 2. treatments.gateway_prices ─────────────────────────────
-- Map of gateway name → { term → price_id }.
-- Example:
--   {
--     "stripe": {
--       "monthly":   "price_1MoXX...",
--       "quarterly": "price_1QrXX...",
--       "annually":  "price_1AnXX..."
--     }
--   }
-- Populated manually after Stripe Products are created
-- (see Task #3 — Define Products and Prices in Stripe Dashboard).
-- Do NOT seed here — Price IDs don't exist until Stripe is configured.
ALTER TABLE treatments
  ADD COLUMN gateway_prices JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_treatments_gateway_prices
  ON treatments USING GIN (gateway_prices);


-- ── 3. subscriptions.gateway_price_id ────────────────────────
-- The specific Stripe Price (or other gateway price) actually
-- charged on this subscription. Lets us answer "how many
-- patients are on the monthly tier vs quarterly?" without
-- digging into gateway_metadata.
ALTER TABLE subscriptions
  ADD COLUMN gateway_price_id TEXT;

CREATE INDEX idx_sub_price ON subscriptions(gateway_price_id);


-- ── 4. stripe_events (webhook idempotency) ───────────────────
-- Stripe sends each webhook at-least-once. We must dedupe on
-- event.id before processing, otherwise duplicate writes will
-- create double charges in our records, double subscriptions,
-- etc.
--
-- Processing protocol (in /api/stripe/webhook):
--   1. Verify signature.
--   2. INSERT event row with processed_at = NULL. If the event
--      ID already exists we get a unique-violation — return 200
--      immediately (already processed or in-flight).
--   3. Process the event (update payments / subscriptions).
--   4. UPDATE the row to set processed_at = now().
--   5. On error, increment attempts and store error text;
--      Stripe will retry on its own (we don't need our own
--      retry queue for v1).
CREATE TABLE stripe_events (
  -- Stripe's evt_xxx ID is the primary key — guarantees dedup.
  id              TEXT PRIMARY KEY,

  type            TEXT NOT NULL,        -- e.g. 'checkout.session.completed'
  livemode        BOOLEAN NOT NULL,     -- true in production, false in test mode
  api_version     TEXT,                 -- Stripe API version that produced the event

  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ,          -- NULL until handler completes successfully

  -- Full event body — keeps a forensic record without round-tripping to Stripe.
  payload         JSONB NOT NULL,

  -- Failure tracking. We don't retry inside our app; Stripe retries
  -- with its own backoff (up to 3 days). attempts records how many
  -- times Stripe has redelivered to us.
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT
);

-- Hot-path index for ops dashboards: "show me unprocessed events".
CREATE INDEX idx_events_pending
  ON stripe_events(received_at)
  WHERE processed_at IS NULL;

CREATE INDEX idx_events_type ON stripe_events(type);


-- ── Row-Level Security ──────────────────────────────────────
-- stripe_events holds raw Stripe payloads which include payment
-- metadata. Service-role-only — same posture as ehr_sync_jobs.
-- Service role bypasses RLS automatically; we explicitly REVOKE
-- from anon and authenticated to prevent any leakage if a policy
-- is added later by mistake.
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON stripe_events FROM anon, authenticated;
