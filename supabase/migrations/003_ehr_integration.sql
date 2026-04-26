-- ============================================================
-- 003_ehr_integration.sql
--
-- Adds the EHR integration plumbing on top of the existing schema.
-- No changes to existing tables.
--
-- Two new tables:
--   1. ehr_external_ids
--      Cross-system ID mapping. One row per (patient, vendor, resource).
--      Generic over EHR vendor — works for Healthie today, any future EHR.
--      Examples we'll write:
--        (patient=X, provider='healthie', resource='client',      external_id=<Healthie user.id>)
--        (patient=X, provider='healthie', resource='appointment', external_id=<Healthie appointment.id>)
--
--   2. ehr_sync_jobs
--      The outbox table. /api/intake inserts a job row and returns immediately.
--      A worker (/api/sync/run) drains the table asynchronously, calls the
--      EHR adapter, persists external IDs, marks success/failure with
--      exponential backoff (30s → 2m → 8m → 30m → 2h, max 5 attempts).
--
-- Both tables are RLS-locked. Service-role only — same posture as the
-- other PHI tables in the schema.
-- ============================================================


-- ── 1. ehr_external_ids ──────────────────────────────────────
CREATE TABLE ehr_external_ids (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  provider      TEXT NOT NULL,        -- 'healthie' | 'mock' | future EHR
  resource_type TEXT NOT NULL,        -- 'client' | 'appointment' | 'form_answer_group' | ...
  external_id   TEXT NOT NULL,        -- the vendor's identifier
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One mapping per (patient, vendor, resource, external id). Re-running
  -- sync with the same answers should be a no-op via the unique constraint.
  UNIQUE (patient_id, provider, resource_type, external_id)
);

CREATE INDEX idx_ehr_ext_patient ON ehr_external_ids(patient_id);
CREATE INDEX idx_ehr_ext_lookup
  ON ehr_external_ids(provider, resource_type, external_id);


-- ── 2. ehr_sync_jobs (outbox) ────────────────────────────────
CREATE TABLE ehr_sync_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  submission_id   UUID REFERENCES intake_submissions(id) ON DELETE CASCADE,

  -- What the worker should do for this row.
  -- 'create_patient_with_intake' is the only operation we ship in v1.
  -- It runs createClient → updateClient, and (if the payload includes
  -- an appointment selection) follows with scheduleAppointment.
  operation       TEXT NOT NULL CHECK (operation IN (
                    'create_patient_with_intake',
                    'schedule_appointment',
                    'update_patient'
                  )),

  -- Captured at enqueue time so a mid-flight EHR_PROVIDER env change
  -- doesn't reroute pending jobs to the wrong vendor.
  target_provider TEXT NOT NULL,

  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 5,
  last_error      TEXT,
  last_attempt_at TIMESTAMPTZ,

  -- Enables exponential backoff: worker only picks rows where
  -- scheduled_for <= now() AND status IN ('pending','failed').
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,

  -- Adapter-specific extras: the appointment slot the patient picked,
  -- and the result of conflict-resolution if the worker had to reschedule.
  -- Keep this JSONB so we don't migrate every time we add a field.
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot-path index: the worker's batch query is "give me the next N pending
-- or failed jobs whose scheduled_for has elapsed."
CREATE INDEX idx_ehr_jobs_pending
  ON ehr_sync_jobs(status, scheduled_for)
  WHERE status IN ('pending', 'failed');

CREATE INDEX idx_ehr_jobs_patient    ON ehr_sync_jobs(patient_id);
CREATE INDEX idx_ehr_jobs_submission ON ehr_sync_jobs(submission_id);

-- Reuse the updated_at trigger function defined in 001_initial_schema.sql.
CREATE TRIGGER trg_ehr_jobs_updated
  BEFORE UPDATE ON ehr_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Row-Level Security ──────────────────────────────────────
-- Both tables hold PHI links by reference. Service-role bypasses RLS;
-- everyone else is denied. No policies needed.
ALTER TABLE ehr_external_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_sync_jobs    ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ehr_external_ids, ehr_sync_jobs FROM anon, authenticated;
