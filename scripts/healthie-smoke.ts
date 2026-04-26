/**
 * Healthie sandbox smoke test.
 *
 * Bypasses the entire app stack — no Supabase, no Next.js, no outbox.
 * Just our adapter against the real Healthie sandbox. If this passes,
 * the integration is correct at the vendor layer and we can safely
 * proceed with Steps 4-5 (the outbox hook + worker).
 *
 * Modes (controlled by SMOKE_MODE env var or first CLI arg):
 *   ping            — auth check via currentUser query (fastest)
 *   list-slots      — query availableSlotsForRange for state=NY, 14 days
 *   create          — full createClient → updateClient roundtrip
 *                     (auto-runs verify on the new user afterwards)
 *   verify          — query an existing user back from Healthie and print
 *                     stored fields. Pass SMOKE_VERIFY_USER_ID=<id>.
 *   all (default)   — runs ping + list-slots + create (which includes verify)
 *
 * Run with:
 *   npm run healthie:smoke                                   # all
 *   SMOKE_MODE=ping       npm run healthie:smoke
 *   SMOKE_MODE=list-slots npm run healthie:smoke
 *   SMOKE_MODE=create     npm run healthie:smoke
 *   SMOKE_MODE=verify SMOKE_VERIFY_USER_ID=5891392 npm run healthie:smoke
 *
 * Idempotency test (re-run with the same suffix; expect same Healthie id):
 *   SMOKE_EMAIL_SUFFIX=fixed-001 npm run healthie:smoke
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

// Load .env.local before importing anything that reads env.
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { GraphQLClient, gql } from 'graphql-request'
import { HealthieAdapter } from '../src/lib/ehr/healthie'
import { intakeToCanonical, formatClinicalSummary } from '../src/lib/ehr/transform'
import type { IntakeData } from '../src/lib/intake-flow'

function require_env(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`\n  ERROR: env var ${name} is not set in .env.local\n`)
    process.exit(2)
  }
  return v
}

const mode = (process.env.SMOKE_MODE ?? process.argv[2] ?? 'all').toLowerCase()

async function main() {
  const apiUrl    = require_env('HEALTHIE_API_URL')
  const apiKey    = require_env('HEALTHIE_API_KEY')
  const dietitian = require_env('HEALTHIE_DEFAULT_DIETITIAN_ID')

  const adapter = new HealthieAdapter({
    apiUrl,
    apiKey,
    defaultDietitianId: dietitian,
    appointmentTypeId:  process.env.HEALTHIE_APPOINTMENT_TYPE_ID,
    appointmentTypeName: process.env.HEALTHIE_APPOINTMENT_TYPE_NAME,
  })

  if (mode === 'ping' || mode === 'all') {
    await runPing(adapter)
  }

  if (mode === 'list-slots' || mode === 'all') {
    await runListSlots(adapter)
  }

  if (mode === 'create' || mode === 'all') {
    const newUserId = await runCreateRoundtrip(adapter)
    if (newUserId) {
      await runVerify(apiUrl, apiKey, newUserId)
    }
  }

  if (mode === 'verify') {
    const verifyId = process.env.SMOKE_VERIFY_USER_ID
    if (!verifyId) {
      console.error('\n  ERROR: SMOKE_MODE=verify requires SMOKE_VERIFY_USER_ID=<healthie user id>\n')
      process.exit(2)
    }
    await runVerify(apiUrl, apiKey, verifyId)
  }

  console.log('\n──────────  SMOKE TEST PASSED  ──────────\n')
}

// ─── Mode: ping ──────────────────────────────────────────────────────────
async function runPing(adapter: HealthieAdapter) {
  console.log('\n[ping] Checking Healthie sandbox auth...')
  const ping = await adapter.ping()
  if (!ping.ok) {
    console.error(`  FAIL: ping returned not-ok. Detail: ${ping.detail}`)
    console.error('  → Check HEALTHIE_API_KEY and HEALTHIE_API_URL.')
    process.exit(1)
  }
  console.log(`  ok  ${ping.detail ?? 'authenticated'}`)
}

// ─── Mode: list-slots ────────────────────────────────────────────────────
async function runListSlots(adapter: HealthieAdapter) {
  console.log('\n[list-slots] Querying availability for state=NY, 14 days ahead...')
  const today = new Date()
  const fortnight = new Date(today)
  fortnight.setDate(fortnight.getDate() + 14)
  const slots = await adapter.getAvailableSlots({
    state:       'NY',
    startDate:   today.toISOString().slice(0, 10),
    endDate:     fortnight.toISOString().slice(0, 10),
    contactType: 'video',
  })

  console.log(`  ok  Healthie returned ${slots.length} bookable 20-min slots.`)
  if (slots.length === 0) {
    console.warn(
      '  WARN: zero slots returned. Possible causes:\n' +
      '        - Sandbox MD has no Availability windows configured (Settings → Calendar → Availability)\n' +
      '        - The "Initial Consultation" appointment type isn\'t bookable by clients\n' +
      '        - Sandbox MD isn\'t licensed in NY (check Settings → Members → Licensed in)\n' +
      '        Open Healthie sandbox UI and verify before proceeding.',
    )
  } else {
    // Print first 5 for sanity
    for (const s of slots.slice(0, 5)) {
      console.log(`        ${s.datetime}  provider=${s.providerExternalId}  ${s.contactType}`)
    }
    if (slots.length > 5) console.log(`        ...and ${slots.length - 5} more`)
  }
}

// ─── Mode: create-roundtrip ──────────────────────────────────────────────
async function runCreateRoundtrip(adapter: HealthieAdapter): Promise<string | null> {
  const suffix    = process.env.SMOKE_EMAIL_SUFFIX ?? `${Date.now()}`
  const testEmail = `smoke+${suffix}@preventivemd.dev`

  console.log(`\n[create] Synthetic patient → createClient → updateClient`)
  console.log(`         email=${testEmail}`)

  const sample: IntakeData = {
    firstName: 'Smoke', lastName: `Test_${suffix}`,
    sex: 'male', dob: '1985-06-15', state: 'NY',
    phone: '(415) 555-2671', smsOptIn: true,
    heightFeet: '5', heightInches: '10', weight: '200',
    weightGoal: 'Lose 20-40 lbs', priorWeightMgmt: ['diet', 'exercise'],
    glp1History: [], glp1Reactions: '', glp1ReactionDetails: '',
    healthGoals: ['weight-loss', 'energy-longevity'],
    recentWeightChange: 'no', weightLossAmount: '',
    medicalConditions: ['none'], conditionsOther: '',
    medications: [], medicationsOther: '',
    exerciseFrequency: '1-2', sleepQuality: 'fair', sleepHours: '6-7',
    stressLevel: 'moderate', diet: 'unhealthy',
    visitType: 'async', appointmentDate: '', appointmentTime: '',
    desiredTreatments: ['glp1'], bmi: null,
  }

  const { patient, intake, errors } = intakeToCanonical(sample, {
    email: testEmail,
    consents: { telehealth: true, hipaa: true, tcpa: true },
    acquisition: { source: 'smoke-test', campaign: 'phase-a' },
  })
  if (errors.length) {
    console.error(`  FAIL: transform errors: ${JSON.stringify(errors)}`)
    process.exit(1)
  }
  console.log(`  ok  transform clean (bmi=${patient.bmi})`)

  const summary = formatClinicalSummary(sample, patient, intake)
  console.log(`  ok  clinical summary built (${summary.length} chars)`)

  const fakeCanonicalId = `smoke-${suffix}-0000-0000-0000-000000000000`
  const result = await adapter.createPatientWithIntake({
    patient,
    intake,
    idempotencyKey:      `smoke-${suffix}`,
    patientCanonicalId:  fakeCanonicalId,
    clinicalSummaryText: summary,
    rawIntakePayload:    { data: sample, smokeRun: true },
    // Synthetic address so Healthie writes the location row.
    // Real intake will pull this from /checkout's delivery address.
    address: {
      line1: '123 Smoke Test Lane',
      city:  'New York',
      state: patient.state,
      zip:   '10001',
    },
  })

  console.log(`  ok  Healthie user id = ${result.externalPatientId}`)
  for (const extra of result.additionalIds ?? []) {
    console.log(`  ok  additionalId  type=${extra.resourceType}  id=${extra.externalId}`)
  }
  return result.externalPatientId
}

// ─── Mode: verify ────────────────────────────────────────────────────────
// Fetch a Healthie user back and print the fields we care about. Confirms
// what actually landed in the EHR vs. what we sent.
async function runVerify(apiUrl: string, apiKey: string, userId: string) {
  console.log(`\n[verify] Fetching Healthie user id=${userId} to confirm assignment...`)

  const client = new GraphQLClient(apiUrl, {
    headers: {
      Authorization:       `Basic ${apiKey}`,
      AuthorizationSource: 'API',
    },
  })

  const Q = gql`
    query GetUser($id: ID) {
      user(id: $id) {
        id
        first_name
        last_name
        email
        gender
        sex
        height
        record_identifier
        quick_notes
        dietitian_id
        dietitian {
          id
          full_name
          email
        }
        location {
          line1
          city
          state
          zip
        }
      }
    }
  `

  const r: any = await client.request(Q, { id: userId })
  const u = r?.user
  if (!u) {
    console.error(`  FAIL: Healthie returned no user for id=${userId}`)
    process.exit(1)
  }

  console.log(`  ok  ${u.first_name} ${u.last_name} <${u.email}>`)
  console.log(`        record_identifier = ${u.record_identifier ?? '(empty)'}`)
  console.log(`        gender = ${u.gender ?? '(empty)'}    sex = ${u.sex ?? '(empty)'}    height = ${u.height ?? '(empty)'}`)

  if (u.dietitian) {
    const expected = process.env.HEALTHIE_DEFAULT_DIETITIAN_ID
    const matches  = u.dietitian.id === expected
    const flag     = matches ? 'ok ' : 'WARN'
    console.log(`  ${flag}  assigned provider: ${u.dietitian.full_name} (id=${u.dietitian.id})`)
    if (!matches) {
      console.log(`        expected dietitian id = ${expected}; got ${u.dietitian.id}`)
    }
  } else if (u.dietitian_id) {
    console.log(`  ok  dietitian_id = ${u.dietitian_id} (full provider record not returned)`)
  } else {
    console.log(`  WARN  no provider assigned`)
  }

  if (u.location) {
    console.log(`  ok  location: ${u.location.line1}, ${u.location.city}, ${u.location.state} ${u.location.zip}`)
  } else {
    console.log(`  WARN  no location set on chart`)
  }

  if (u.quick_notes) {
    const preview = u.quick_notes.split('\n').slice(0, 3).join(' | ')
    console.log(`  ok  quick_notes (${u.quick_notes.length} chars): ${preview}…`)
  } else {
    console.log(`  WARN  quick_notes is empty`)
  }
}

main().catch((err) => {
  console.error('\n  SMOKE TEST FAILED')
  console.error(`  ${err?.message ?? err}`)
  if (err?.statusCode)    console.error(`  statusCode: ${err.statusCode}`)
  if (err?.vendorPayload) {
    console.error(`  vendorPayload: ${JSON.stringify(err.vendorPayload, null, 2)}`)
  }
  if (err?.cause) {
    console.error(`  cause: ${err.cause?.message ?? err.cause}`)
  }
  if (err?.stack) {
    console.error(`\n  stack:\n${err.stack}`)
  }
  process.exit(1)
})
