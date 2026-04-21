-- ============================================================
-- PreventiveMD — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Created: 2026-04-16
--
-- Design principles:
--   1. Gateway-agnostic payments (no Stripe-specific columns)
--   2. JSONB for intake responses (form can evolve without migrations)
--   3. Unified conversations system (clinical + support in one place)
--   4. Row-Level Security on all patient-facing tables
--   5. Soft deletes where appropriate (archived_at instead of DELETE)
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PATIENTS
-- Core identity record, linked to Supabase Auth (auth.users)
-- ============================================================
CREATE TABLE patients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Demographics
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  date_of_birth DATE,
  sex           TEXT CHECK (sex IN ('male', 'female', 'other', 'prefer_not_to_say')),
  state         TEXT,          -- US state abbreviation

  -- Status
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive', 'archived')),
  sms_opt_in    BOOLEAN DEFAULT false,

  -- Metadata
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ
);

CREATE INDEX idx_patients_auth_user   ON patients(auth_user_id);
CREATE INDEX idx_patients_email       ON patients(email);
CREATE INDEX idx_patients_state       ON patients(state);
CREATE INDEX idx_patients_status      ON patients(status);

-- ============================================================
-- 2. PROVIDERS
-- Licensed providers who consult with patients
-- ============================================================
CREATE TABLE providers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Identity
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,

  -- Professional
  credentials   TEXT,          -- e.g. "MD", "DO", "NP", "PA"
  npi_number    TEXT,          -- National Provider Identifier
  specialties   TEXT[],        -- Array: ['weight_management', 'peptide_therapy']
  license_states TEXT[],       -- States where licensed to practice
  bio           TEXT,

  -- Availability
  is_active     BOOLEAN NOT NULL DEFAULT true,
  accepts_new   BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_providers_active ON providers(is_active) WHERE is_active = true;

-- ============================================================
-- 3. INTAKE SUBMISSIONS
-- Dynamic intake form responses stored as JSONB
-- form_version tracks which version of the form was used
-- ============================================================
CREATE TABLE intake_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Form metadata
  form_version  TEXT NOT NULL DEFAULT '1.0',      -- Tracks form schema version
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'submitted', 'under_review', 'reviewed', 'archived')),

  -- The flexible part: entire form response as JSONB
  -- This is the full IntakeData object from the frontend
  responses     JSONB NOT NULL DEFAULT '{}',

  -- Extracted/indexed fields for fast queries
  -- These are pulled from responses for provider filtering
  bmi           NUMERIC(5,2),
  visit_type    TEXT CHECK (visit_type IN ('sync', 'async')),
  patient_state TEXT,          -- Denormalized for quick filtering

  -- Provider review
  reviewed_by   UUID REFERENCES providers(id),
  reviewed_at   TIMESTAMPTZ,
  review_notes  TEXT,

  -- Metadata
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intake_patient    ON intake_submissions(patient_id);
CREATE INDEX idx_intake_status     ON intake_submissions(status);
CREATE INDEX idx_intake_visit_type ON intake_submissions(visit_type);
CREATE INDEX idx_intake_responses  ON intake_submissions USING GIN (responses);  -- JSONB queries

-- ============================================================
-- 4. TREATMENTS
-- Catalog of available treatments/protocols
-- ============================================================
CREATE TABLE treatments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,              -- URL-safe: 'semaglutide', 'bpc-157'
  name          TEXT NOT NULL,                     -- Display: 'Semaglutide'
  category      TEXT NOT NULL,                     -- 'glp1', 'peptide', 'nad', 'hormone'
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treatments_slug     ON treatments(slug);
CREATE INDEX idx_treatments_category ON treatments(category);
CREATE INDEX idx_treatments_active   ON treatments(is_active) WHERE is_active = true;

-- ============================================================
-- 5. PATIENT TREATMENTS
-- Junction: which treatments a patient is interested in / prescribed
-- ============================================================
CREATE TABLE patient_treatments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_id  UUID NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  provider_id   UUID REFERENCES providers(id),

  status        TEXT NOT NULL DEFAULT 'requested'
                CHECK (status IN ('requested', 'prescribed', 'active', 'paused', 'discontinued', 'completed')),

  -- Dosing (filled in by provider)
  dosage        TEXT,          -- e.g. "0.25mg weekly"
  frequency     TEXT,          -- e.g. "weekly", "daily"
  instructions  TEXT,          -- Special instructions
  start_date    DATE,
  end_date      DATE,

  -- Metadata
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pt_patient   ON patient_treatments(patient_id);
CREATE INDEX idx_pt_treatment ON patient_treatments(treatment_id);
CREATE INDEX idx_pt_status    ON patient_treatments(status);
CREATE UNIQUE INDEX idx_pt_unique_active ON patient_treatments(patient_id, treatment_id)
  WHERE status IN ('requested', 'prescribed', 'active');

-- ============================================================
-- 6. APPOINTMENTS
-- Scheduling for sync (video) and async consultations
-- ============================================================
CREATE TABLE appointments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id   UUID REFERENCES providers(id),

  -- Scheduling
  type          TEXT NOT NULL CHECK (type IN ('sync', 'async')),
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  scheduled_at  TIMESTAMPTZ,   -- For sync visits
  duration_min  INTEGER DEFAULT 30,

  -- Video call
  video_room_url TEXT,         -- Daily.co or Doxy.me room link

  -- Intake link
  intake_id     UUID REFERENCES intake_submissions(id),

  -- Notes
  provider_notes TEXT,
  patient_notes  TEXT,

  -- Metadata
  cancelled_at   TIMESTAMPTZ,
  cancel_reason  TEXT,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appt_patient    ON appointments(patient_id);
CREATE INDEX idx_appt_provider   ON appointments(provider_id);
CREATE INDEX idx_appt_status     ON appointments(status);
CREATE INDEX idx_appt_scheduled  ON appointments(scheduled_at);

-- ============================================================
-- 7. CONVERSATIONS
-- Unified thread container for clinical + support messaging
-- ============================================================
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Routing
  type          TEXT NOT NULL CHECK (type IN ('clinical', 'support', 'system')),
  subject       TEXT,          -- Optional thread subject
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'awaiting_patient', 'awaiting_provider', 'awaiting_support', 'resolved', 'archived')),

  -- Assignment
  assigned_to         UUID,    -- Could be provider or support agent (flexible FK)
  assigned_role       TEXT CHECK (assigned_role IN ('provider', 'support')),

  -- Links (optional context for the conversation)
  appointment_id      UUID REFERENCES appointments(id),
  prescription_id     UUID,    -- Forward reference, filled after prescriptions table exists

  -- Metadata
  last_message_at     TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conv_patient    ON conversations(patient_id);
CREATE INDEX idx_conv_type       ON conversations(type);
CREATE INDEX idx_conv_status     ON conversations(status);
CREATE INDEX idx_conv_assigned   ON conversations(assigned_to);
CREATE INDEX idx_conv_last_msg   ON conversations(last_message_at DESC);

-- ============================================================
-- 8. MESSAGES
-- Individual messages within a conversation
-- Powered by Supabase Realtime for live updates
-- ============================================================
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Sender
  sender_id       UUID NOT NULL,       -- auth.users ID (patient, provider, or support)
  sender_role     TEXT NOT NULL
                  CHECK (sender_role IN ('patient', 'provider', 'support', 'system')),

  -- Content
  body            TEXT,                -- Message text (nullable if attachment-only)
  attachments     JSONB DEFAULT '[]',  -- [{name, url, type, size}]

  -- Status
  read_at         TIMESTAMPTZ,
  edited_at       TIMESTAMPTZ,

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_msg_conversation ON messages(conversation_id);
CREATE INDEX idx_msg_sender       ON messages(sender_id);
CREATE INDEX idx_msg_created      ON messages(created_at);
CREATE INDEX idx_msg_unread       ON messages(conversation_id, read_at) WHERE read_at IS NULL;

-- ============================================================
-- 9. PRESCRIPTIONS
-- Bridge to EHR / e-prescribing (Photon Health, etc.)
-- ============================================================
CREATE TABLE prescriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES providers(id),
  treatment_id    UUID REFERENCES treatments(id),
  appointment_id  UUID REFERENCES appointments(id),

  -- Prescription details
  medication_name TEXT NOT NULL,
  dosage          TEXT NOT NULL,        -- "0.5mg"
  frequency       TEXT,                 -- "weekly"
  quantity        TEXT,                 -- "4 vials"
  refills         INTEGER DEFAULT 0,
  instructions    TEXT,                 -- Sig / patient instructions

  -- EHR integration (gateway-agnostic)
  ehr_provider    TEXT,                 -- 'photon_health', 'dosespot', 'manual'
  ehr_external_id TEXT,                 -- External reference ID from EHR system
  ehr_metadata    JSONB DEFAULT '{}',   -- Any extra data from the EHR API

  -- Pharmacy
  pharmacy_name   TEXT,
  pharmacy_type   TEXT CHECK (pharmacy_type IN ('compounding', 'retail', 'mail_order')),
  pharmacy_id     TEXT,                 -- External pharmacy ID

  -- Status
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'pending_review', 'sent_to_pharmacy', 'filled', 'shipped', 'delivered', 'cancelled')),
  prescribed_at   TIMESTAMPTZ,
  filled_at       TIMESTAMPTZ,
  shipped_at      TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,

  -- Tracking
  tracking_number TEXT,
  tracking_url    TEXT,

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rx_patient    ON prescriptions(patient_id);
CREATE INDEX idx_rx_provider   ON prescriptions(provider_id);
CREATE INDEX idx_rx_status     ON prescriptions(status);
CREATE INDEX idx_rx_ehr        ON prescriptions(ehr_provider, ehr_external_id);

-- Now add the forward FK on conversations
ALTER TABLE conversations
  ADD CONSTRAINT fk_conv_prescription
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id);

-- ============================================================
-- 10. PAYMENTS
-- Gateway-agnostic payment records
-- ============================================================
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Gateway info (works with Stripe, Square, Helcim, etc.)
  gateway         TEXT NOT NULL,        -- 'stripe', 'square', 'helcim', 'paypal'
  gateway_payment_id    TEXT,           -- External payment/charge ID
  gateway_customer_id   TEXT,           -- External customer ID
  gateway_metadata      JSONB DEFAULT '{}',  -- Any extra gateway-specific data

  -- Payment details
  amount_cents    INTEGER NOT NULL,     -- Store in cents to avoid float issues
  currency        TEXT NOT NULL DEFAULT 'usd',
  type            TEXT NOT NULL
                  CHECK (type IN ('consult_fee', 'subscription', 'one_time', 'refund', 'adjustment')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'disputed')),
  description     TEXT,                 -- Human-readable: "Initial consult fee"

  -- Links
  appointment_id  UUID REFERENCES appointments(id),
  subscription_id UUID,                 -- Forward ref to subscriptions table

  -- Refund tracking
  refund_amount_cents INTEGER,
  refund_reason       TEXT,
  refunded_at         TIMESTAMPTZ,

  -- Metadata
  paid_at         TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pay_patient   ON payments(patient_id);
CREATE INDEX idx_pay_gateway   ON payments(gateway, gateway_payment_id);
CREATE INDEX idx_pay_status    ON payments(status);
CREATE INDEX idx_pay_type      ON payments(type);
CREATE INDEX idx_pay_created   ON payments(created_at DESC);

-- ============================================================
-- 11. SUBSCRIPTIONS
-- Recurring billing (gateway-agnostic)
-- ============================================================
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_id    UUID REFERENCES treatments(id),

  -- Gateway info
  gateway         TEXT NOT NULL,        -- 'stripe', 'square', etc.
  gateway_subscription_id TEXT,         -- External subscription ID
  gateway_customer_id     TEXT,
  gateway_metadata        JSONB DEFAULT '{}',

  -- Plan details
  plan_name       TEXT NOT NULL,        -- "GLP-1 Monthly", "Peptide Therapy"
  amount_cents    INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'usd',
  interval        TEXT NOT NULL CHECK (interval IN ('weekly', 'monthly', 'quarterly', 'annually')),

  -- Status
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('trialing', 'active', 'paused', 'past_due', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at            TIMESTAMPTZ,     -- Scheduled cancellation

  -- Metadata
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_patient   ON subscriptions(patient_id);
CREATE INDEX idx_sub_status    ON subscriptions(status);
CREATE INDEX idx_sub_gateway   ON subscriptions(gateway, gateway_subscription_id);

-- Add FK from payments to subscriptions
ALTER TABLE payments
  ADD CONSTRAINT fk_pay_subscription
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- Auto-update updated_at on any row modification
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_patients_updated      BEFORE UPDATE ON patients           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_providers_updated     BEFORE UPDATE ON providers          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_intake_updated        BEFORE UPDATE ON intake_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_treatments_updated    BEFORE UPDATE ON treatments         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pt_updated            BEFORE UPDATE ON patient_treatments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appt_updated          BEFORE UPDATE ON appointments       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conv_updated          BEFORE UPDATE ON conversations      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rx_updated            BEFORE UPDATE ON prescriptions      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pay_updated           BEFORE UPDATE ON payments           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sub_updated           BEFORE UPDATE ON subscriptions      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW-LEVEL SECURITY (RLS)
-- Patients can only see their own data
-- Providers can see patients assigned to them
-- ============================================================

-- Enable RLS on all patient-facing tables
ALTER TABLE patients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_treatments ENABLE ROW LEVEL SECURITY;

-- Treatments catalog is public (read-only)
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Treatments are viewable by everyone"
  ON treatments FOR SELECT USING (true);

-- ── PATIENT POLICIES ────────────────────────────────────────
-- Patients see only their own records

CREATE POLICY "Patients can view own profile"
  ON patients FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Patients can update own profile"
  ON patients FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "Patients can view own intakes"
  ON intake_submissions FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid()));

CREATE POLICY "Patients can insert own intakes"
  ON intake_submissions FOR INSERT
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid()));

CREATE POLICY "Patients can update own draft intakes"
  ON intake_submissions FOR UPDATE
  USING (
    patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid())
    AND status = 'draft'
  );

CREATE POLICY "Patients can view own appointments"
  ON appointments FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid()));

CREATE POLICY "Patients can view own conversations"
  ON conversations FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid()));

CREATE POLICY "Patients can view messages in own conversations"
  ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Patients can send messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM conversations
    WHERE patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Patients can view own prescriptions"
  ON prescriptions FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid()));

CREATE POLICY "Patients can view own payments"
  ON payments FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid()));

CREATE POLICY "Patients can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid()));

CREATE POLICY "Patients can view own treatments"
  ON patient_treatments FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE auth_user_id = auth.uid()));

-- ── PROVIDER POLICIES ───────────────────────────────────────
-- Providers see patients they're assigned to via appointments

CREATE POLICY "Providers can view assigned patients"
  ON patients FOR SELECT
  USING (
    id IN (
      SELECT patient_id FROM appointments
      WHERE provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Providers can view assigned intakes"
  ON intake_submissions FOR SELECT
  USING (
    patient_id IN (
      SELECT patient_id FROM appointments
      WHERE provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Providers can review intakes"
  ON intake_submissions FOR UPDATE
  USING (
    reviewed_by IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
    OR patient_id IN (
      SELECT patient_id FROM appointments
      WHERE provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Providers can view assigned appointments"
  ON appointments FOR SELECT
  USING (provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Providers can update assigned appointments"
  ON appointments FOR UPDATE
  USING (provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Providers can view assigned conversations"
  ON conversations FOR SELECT
  USING (assigned_to IN (SELECT id FROM providers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Providers can view messages in assigned conversations"
  ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE assigned_to IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Providers can send messages in assigned conversations"
  ON messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM conversations
    WHERE assigned_to IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Providers can manage prescriptions they created"
  ON prescriptions FOR ALL
  USING (provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Providers can view patient treatments"
  ON patient_treatments FOR SELECT
  USING (
    patient_id IN (
      SELECT patient_id FROM appointments
      WHERE provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Providers can manage patient treatments"
  ON patient_treatments FOR ALL
  USING (provider_id IN (SELECT id FROM providers WHERE auth_user_id = auth.uid()));

-- ============================================================
-- SEED: Initial treatment catalog
-- Matches the treatments from the Next.js site
-- ============================================================
INSERT INTO treatments (slug, name, category) VALUES
  ('semaglutide',  'Semaglutide',  'glp1'),
  ('tirzepatide',  'Tirzepatide',  'glp1'),
  ('bpc-157',      'BPC-157',      'peptide'),
  ('nad',          'NAD+',         'nad'),
  ('sermorelin',   'Sermorelin',   'peptide'),
  ('tb-500',       'TB-500',       'peptide'),
  ('ipamorelin',   'Ipamorelin',   'peptide'),
  ('igf-1',        'IGF-1',        'peptide'),
  ('hexarelin',    'Hexarelin',    'peptide'),
  ('aod-9604',     'AOD-9604',     'peptide'),
  ('mk-677',       'MK-677',       'peptide'),
  ('ghk-cu',       'GHK-Cu',       'peptide'),
  ('glutathione',  'Glutathione',  'antioxidant'),
  ('tesamorelin',  'Tesamorelin',  'peptide');
