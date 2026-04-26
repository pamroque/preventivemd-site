-- ============================================================
-- 005_providers_archived_at.sql
--
-- Adds archived_at to the providers table. Mirrors the same column
-- on `patients` (added in migration 001).
--
-- Why we need it (vs. just using is_active=false for "go away"):
--
--   is_active    — synced from EHR. The sync endpoint refreshes this
--                  every 6 hours from organizationMembers.is_active_provider.
--   archived_at  — local flag. Set when a provider stops appearing in
--                  the upstream EHR pull (they were deleted in Healthie).
--                  Distinct from is_active so manual ops decisions
--                  ("don't route to this person right now") don't get
--                  overwritten by sync.
--
-- Nullable. Null = not archived. Timestamp = soft-deleted at that time.
-- ============================================================

ALTER TABLE providers
  ADD COLUMN archived_at TIMESTAMPTZ;

CREATE INDEX idx_providers_archived
  ON providers(archived_at)
  WHERE archived_at IS NULL;
