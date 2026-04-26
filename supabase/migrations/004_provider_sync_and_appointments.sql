-- ============================================================
-- 004_provider_sync_and_appointments.sql
--
-- Two changes, both serving the same goal: make provider routing
-- data-driven (no env vars, no hardcoded IDs) and start mirroring
-- Healthie appointments back to our DB.
--
-- 1. provider_external_ids
--    Mirror of ehr_external_ids but for providers. Vendor-agnostic
--    cross-system mapping. Adding a provider becomes:
--      INSERT INTO providers (...)            -- canonical record
--      INSERT INTO provider_external_ids (...) -- Healthie mapping
--    Both rows happen automatically via the /api/admin/sync-providers
--    endpoint that pulls from Healthie's organizationMembers query.
--
--    Migrating to a new EHR? Implement listProviders() for that
--    adapter, run sync, new rows appear with vendor='newvendor'.
--    Old rows with vendor='healthie' stay for reconciliation.
--
-- 2. appointments.ehr_external_id + ehr_provider
--    Cross-system link from our appointment row to the EHR's
--    appointment record. Sync-visit appointments get the Healthie
--    appointment.id stamped here. Async-visit appointments stay
--    null (no Healthie appointment exists for async).
-- ============================================================


-- ── 1. provider_external_ids ────────────────────────────────
CREATE TABLE provider_external_ids (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  vendor       TEXT NOT NULL,           -- 'healthie' | future EHR
  external_id  TEXT NOT NULL,           -- vendor's user/practitioner ID
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One mapping per (provider, vendor): a provider has one Healthie ID,
  -- not multiple.
  UNIQUE (provider_id, vendor),
  -- One reverse mapping per (vendor, external_id): a Healthie user maps
  -- to exactly one of our providers.
  UNIQUE (vendor, external_id)
);

CREATE INDEX idx_provider_ext_lookup
  ON provider_external_ids(vendor, external_id);

CREATE TRIGGER trg_provider_ext_updated
  BEFORE UPDATE ON provider_external_ids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. appointments: cross-system identity ──────────────────
ALTER TABLE appointments
  ADD COLUMN ehr_external_id TEXT,
  ADD COLUMN ehr_provider    TEXT;       -- 'healthie' | 'mock' | ...

-- Partial index: only meaningful for rows that have a vendor mapping.
CREATE INDEX idx_appointments_ehr
  ON appointments(ehr_provider, ehr_external_id)
  WHERE ehr_external_id IS NOT NULL;


-- ── Row-Level Security ─────────────────────────────────────
-- Same posture as ehr_external_ids and ehr_sync_jobs: service-role
-- only. Provider data is sensitive (NPI, license info), and the
-- mapping itself reveals which patients are linked to which Healthie
-- accounts via the join chain.
ALTER TABLE provider_external_ids ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON provider_external_ids FROM anon, authenticated;
