-- ============================================================
-- 006_provider_assignments_and_availability.sql
--
-- Rearchitecture: separate "provider assigned to patient" from
-- "scheduled calendar event with provider", plus introduce the
-- soft-hold table for /book-consultation slot reservations.
--
-- Why now:
--   The previous design used `appointments` as both — async patients
--   got rows with scheduled_at NULL, conflating two distinct concepts.
--   Reassignments lost history, async metrics had no "completed_at"
--   anchor, and the Healthie webhook integration (when it lands) had
--   nowhere to route "provider switched" events cleanly.
--
-- Three changes:
--   1. provider_assignments — patient↔provider relationship, with
--      lifecycle and reassignment-history support.
--   2. provisional_appointments — 10-min soft-hold for slots picked
--      at /book-consultation but not yet finalized at /checkout.
--   3. appointments.assignment_id — link to the assignment this
--      appointment fulfills.
--
-- DEFERRED: language-based routing. Async flow doesn't capture a
-- language preference, so filtering on it would over-restrict the
-- routing pool. Will re-introduce when we have a concrete routing
-- need (e.g., Spanish-speaking patient must reach Spanish-speaking
-- provider). Schema for that addition is a one-line ALTER later.
-- ============================================================


-- ── 1. provider_assignments ─────────────────────────────────
CREATE TABLE provider_assignments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id         UUID NOT NULL REFERENCES providers(id),
  intake_id           UUID REFERENCES intake_submissions(id),

  visit_type          TEXT NOT NULL CHECK (visit_type IN ('sync','async')),

  -- Lifecycle. active = currently the patient's provider.
  -- transferred = ops/healthie reassigned to another provider.
  -- completed = case closed (visit done, treatment given/declined).
  -- cancelled = patient or provider pulled out before any work.
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','transferred','completed','cancelled')),

  -- Lifecycle timestamps
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  transferred_at      TIMESTAMPTZ,
  -- When transferred, this points at the new assignment that took over.
  -- Forms a chain — to find the current assignment, follow until you hit
  -- a row where transferred_to_assignment_id IS NULL.
  transferred_to_assignment_id UUID REFERENCES provider_assignments(id),

  -- Cross-system reference (if the EHR creates its own "assignment"
  -- entity — Healthie doesn't, but a future EHR might).
  ehr_provider        TEXT,
  ehr_external_id     TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Critical hot-path index: "what's the current provider for this patient?"
CREATE INDEX idx_assignment_patient_active
  ON provider_assignments(patient_id)
  WHERE status = 'active';

CREATE INDEX idx_assignment_provider_active
  ON provider_assignments(provider_id, status)
  WHERE status = 'active';

CREATE INDEX idx_assignment_intake ON provider_assignments(intake_id);

CREATE TRIGGER trg_assignment_updated
  BEFORE UPDATE ON provider_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. provisional_appointments (soft-hold) ─────────────────
-- Created when patient picks a slot at /book-consultation. Lives
-- for 10 minutes. Either the patient finishes /checkout (worker
-- promotes it to a real appointments row + deletes this row) or
-- the reservation expires and the slot is bookable again.
CREATE TABLE provisional_appointments (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- session_token from the intake draft cookie. Lets us scope "your
  -- own holds" vs "everyone else's holds" — a patient still in their
  -- own session sees their slot as held, others see it as taken.
  session_token            TEXT NOT NULL,

  provider_id              UUID NOT NULL REFERENCES providers(id),
  ehr_provider             TEXT NOT NULL,            -- 'healthie'
  ehr_provider_external_id TEXT NOT NULL,            -- Healthie user.id
  slot_datetime            TIMESTAMPTZ NOT NULL,
  contact_type             TEXT NOT NULL CHECK (contact_type IN ('video','phone')),

  -- Hard cutoff. Worker / availability query both check expires_at > now().
  expires_at               TIMESTAMPTZ NOT NULL,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One reservation per (vendor + provider + slot). Prevents two patients
-- from holding the same slot simultaneously — the second concurrent
-- INSERT errors with a unique violation, which the API surfaces as 409
-- Conflict to the frontend.
--
-- Note: this is NOT a partial index gated on `expires_at > now()` —
-- Postgres rejects now() in index predicates (must be IMMUTABLE).
-- Instead, the /api/availability/reserve handler is responsible for
-- DELETE-ing expired holds for the same slot *before* INSERT, so an
-- expired-but-uncleaned hold doesn't block a fresh booking. A periodic
-- cron also sweeps expired rows globally to keep the table small.
CREATE UNIQUE INDEX uq_provisional_slot
  ON provisional_appointments (ehr_provider, ehr_provider_external_id, slot_datetime);

-- Lookup index for "what holds does this session have?" (used to
-- promote the hold into a real appointment at /checkout submit).
CREATE INDEX idx_provisional_session
  ON provisional_appointments(session_token, expires_at);

-- Lookup index for the global cleanup sweep (DELETE WHERE expires_at <= now()).
CREATE INDEX idx_provisional_expires_at
  ON provisional_appointments(expires_at);


-- ── 3. appointments.assignment_id ───────────────────────────
ALTER TABLE appointments
  ADD COLUMN assignment_id UUID REFERENCES provider_assignments(id);

CREATE INDEX idx_appointments_assignment ON appointments(assignment_id);


-- ── 4. appointments.status += 'requested' ──────────────────
-- Patient stated a slot at /book-consultation but it's not yet
-- confirmed in Healthie's calendar (today's picker is mock-data).
-- Worker writes `requested` + the patient's chosen scheduled_at;
-- commit 3 flips to `scheduled` after Healthie's createAppointment
-- returns an authoritative confirmed time.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('requested','scheduled','confirmed','in_progress','completed','cancelled','no_show'));


-- ── Row-Level Security ─────────────────────────────────────
-- Both new tables hold PHI links by reference. Service-role only.
ALTER TABLE provider_assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisional_appointments   ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON provider_assignments     FROM anon, authenticated;
REVOKE ALL ON provisional_appointments FROM anon, authenticated;
