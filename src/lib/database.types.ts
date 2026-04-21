/**
 * database.types.ts — TypeScript types for the Supabase schema
 *
 * These mirror the SQL migration (001_initial_schema.sql).
 * Use these for type-safe queries throughout the app.
 *
 * NOTE: Once you connect Supabase, you can auto-generate these with:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/lib/database.types.ts
 */

// ── Base helpers ────────────────────────────────────────────

/** UUID string type for readability */
export type UUID = string

/** ISO 8601 timestamp string */
export type Timestamp = string

// ── PATIENTS ────────────────────────────────────────────────

export type PatientStatus = 'active' | 'inactive' | 'archived'
export type Sex = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface Patient {
  id: UUID
  auth_user_id: UUID | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  date_of_birth: string | null   // DATE as string
  sex: Sex | null
  state: string | null
  status: PatientStatus
  sms_opt_in: boolean
  created_at: Timestamp
  updated_at: Timestamp
  archived_at: Timestamp | null
}

// ── PROVIDERS ───────────────────────────────────────────────

export interface Provider {
  id: UUID
  auth_user_id: UUID | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  credentials: string | null
  npi_number: string | null
  specialties: string[]
  license_states: string[]
  bio: string | null
  is_active: boolean
  accepts_new: boolean
  created_at: Timestamp
  updated_at: Timestamp
}

// ── INTAKE SUBMISSIONS ──────────────────────────────────────

export type IntakeStatus = 'draft' | 'submitted' | 'under_review' | 'reviewed' | 'archived'
export type VisitType = 'sync' | 'async'

export interface IntakeSubmission {
  id: UUID
  patient_id: UUID
  form_version: string
  status: IntakeStatus
  responses: Record<string, unknown>   // JSONB — flexible intake data
  bmi: number | null
  visit_type: VisitType | null
  patient_state: string | null
  reviewed_by: UUID | null
  reviewed_at: Timestamp | null
  review_notes: string | null
  submitted_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

// ── TREATMENTS ──────────────────────────────────────────────

export type TreatmentCategory = 'glp1' | 'peptide' | 'nad' | 'antioxidant' | 'hormone'

export interface Treatment {
  id: UUID
  slug: string
  name: string
  category: string
  description: string | null
  is_active: boolean
  created_at: Timestamp
  updated_at: Timestamp
}

// ── PATIENT TREATMENTS ──────────────────────────────────────

export type PatientTreatmentStatus =
  | 'requested'
  | 'prescribed'
  | 'active'
  | 'paused'
  | 'discontinued'
  | 'completed'

export interface PatientTreatment {
  id: UUID
  patient_id: UUID
  treatment_id: UUID
  provider_id: UUID | null
  status: PatientTreatmentStatus
  dosage: string | null
  frequency: string | null
  instructions: string | null
  start_date: string | null
  end_date: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

// ── APPOINTMENTS ────────────────────────────────────────────

export type AppointmentType = 'sync' | 'async'
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface Appointment {
  id: UUID
  patient_id: UUID
  provider_id: UUID | null
  type: AppointmentType
  status: AppointmentStatus
  scheduled_at: Timestamp | null
  duration_min: number
  video_room_url: string | null
  intake_id: UUID | null
  provider_notes: string | null
  patient_notes: string | null
  cancelled_at: Timestamp | null
  cancel_reason: string | null
  completed_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

// ── CONVERSATIONS ───────────────────────────────────────────

export type ConversationType = 'clinical' | 'support' | 'system'
export type ConversationStatus =
  | 'open'
  | 'awaiting_patient'
  | 'awaiting_provider'
  | 'awaiting_support'
  | 'resolved'
  | 'archived'

export interface Conversation {
  id: UUID
  patient_id: UUID
  type: ConversationType
  subject: string | null
  status: ConversationStatus
  assigned_to: UUID | null
  assigned_role: 'provider' | 'support' | null
  appointment_id: UUID | null
  prescription_id: UUID | null
  last_message_at: Timestamp | null
  resolved_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

// ── MESSAGES ────────────────────────────────────────────────

export type SenderRole = 'patient' | 'provider' | 'support' | 'system'

export interface MessageAttachment {
  name: string
  url: string
  type: string       // MIME type
  size: number       // bytes
}

export interface Message {
  id: UUID
  conversation_id: UUID
  sender_id: UUID
  sender_role: SenderRole
  body: string | null
  attachments: MessageAttachment[]
  read_at: Timestamp | null
  edited_at: Timestamp | null
  created_at: Timestamp
}

// ── PRESCRIPTIONS ───────────────────────────────────────────

export type PharmacyType = 'compounding' | 'retail' | 'mail_order'
export type PrescriptionStatus =
  | 'draft'
  | 'pending_review'
  | 'sent_to_pharmacy'
  | 'filled'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface Prescription {
  id: UUID
  patient_id: UUID
  provider_id: UUID
  treatment_id: UUID | null
  appointment_id: UUID | null
  medication_name: string
  dosage: string
  frequency: string | null
  quantity: string | null
  refills: number
  instructions: string | null
  ehr_provider: string | null
  ehr_external_id: string | null
  ehr_metadata: Record<string, unknown>
  pharmacy_name: string | null
  pharmacy_type: PharmacyType | null
  pharmacy_id: string | null
  status: PrescriptionStatus
  prescribed_at: Timestamp | null
  filled_at: Timestamp | null
  shipped_at: Timestamp | null
  delivered_at: Timestamp | null
  tracking_number: string | null
  tracking_url: string | null
  created_at: Timestamp
  updated_at: Timestamp
}

// ── PAYMENTS ────────────────────────────────────────────────

export type PaymentType = 'consult_fee' | 'subscription' | 'one_time' | 'refund' | 'adjustment'
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'

export interface Payment {
  id: UUID
  patient_id: UUID
  gateway: string
  gateway_payment_id: string | null
  gateway_customer_id: string | null
  gateway_metadata: Record<string, unknown>
  amount_cents: number
  currency: string
  type: PaymentType
  status: PaymentStatus
  description: string | null
  appointment_id: UUID | null
  subscription_id: UUID | null
  refund_amount_cents: number | null
  refund_reason: string | null
  refunded_at: Timestamp | null
  paid_at: Timestamp | null
  failed_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

// ── SUBSCRIPTIONS ───────────────────────────────────────────

export type SubscriptionInterval = 'weekly' | 'monthly' | 'quarterly' | 'annually'
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'paused'
  | 'past_due'
  | 'cancelled'
  | 'expired'

export interface Subscription {
  id: UUID
  patient_id: UUID
  treatment_id: UUID | null
  gateway: string
  gateway_subscription_id: string | null
  gateway_customer_id: string | null
  gateway_metadata: Record<string, unknown>
  plan_name: string
  amount_cents: number
  currency: string
  interval: SubscriptionInterval
  status: SubscriptionStatus
  current_period_start: Timestamp | null
  current_period_end: Timestamp | null
  cancel_at: Timestamp | null
  started_at: Timestamp
  cancelled_at: Timestamp | null
  created_at: Timestamp
  updated_at: Timestamp
}

// ── DATABASE SCHEMA (Supabase-style) ────────────────────────
// Use this as the generic type parameter for createClient<Database>

export interface Database {
  public: {
    Tables: {
      patients:           { Row: Patient;           Insert: Partial<Patient> & Pick<Patient, 'first_name' | 'last_name' | 'email'>; Update: Partial<Patient> }
      providers:          { Row: Provider;          Insert: Partial<Provider> & Pick<Provider, 'first_name' | 'last_name' | 'email'>; Update: Partial<Provider> }
      intake_submissions: { Row: IntakeSubmission;  Insert: Partial<IntakeSubmission> & Pick<IntakeSubmission, 'patient_id'>; Update: Partial<IntakeSubmission> }
      treatments:         { Row: Treatment;         Insert: Partial<Treatment> & Pick<Treatment, 'slug' | 'name' | 'category'>; Update: Partial<Treatment> }
      patient_treatments: { Row: PatientTreatment;  Insert: Partial<PatientTreatment> & Pick<PatientTreatment, 'patient_id' | 'treatment_id'>; Update: Partial<PatientTreatment> }
      appointments:       { Row: Appointment;       Insert: Partial<Appointment> & Pick<Appointment, 'patient_id' | 'type'>; Update: Partial<Appointment> }
      conversations:      { Row: Conversation;      Insert: Partial<Conversation> & Pick<Conversation, 'patient_id' | 'type'>; Update: Partial<Conversation> }
      messages:           { Row: Message;           Insert: Partial<Message> & Pick<Message, 'conversation_id' | 'sender_id' | 'sender_role'>; Update: Partial<Message> }
      prescriptions:      { Row: Prescription;      Insert: Partial<Prescription> & Pick<Prescription, 'patient_id' | 'provider_id' | 'medication_name' | 'dosage'>; Update: Partial<Prescription> }
      payments:           { Row: Payment;           Insert: Partial<Payment> & Pick<Payment, 'patient_id' | 'gateway' | 'amount_cents' | 'type'>; Update: Partial<Payment> }
      subscriptions:      { Row: Subscription;      Insert: Partial<Subscription> & Pick<Subscription, 'patient_id' | 'gateway' | 'plan_name' | 'amount_cents' | 'interval'>; Update: Partial<Subscription> }
    }
  }
}
