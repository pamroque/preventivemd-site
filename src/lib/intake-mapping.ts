/**
 * intake-mapping.ts — Form-shape ↔ canonical IntakeData mapping.
 *
 * The intake form pages were written before the canonical IntakeData type
 * existed and use their own field-name + format conventions. This module
 * is the SINGLE seam where those translate into IntakeData shape.
 *
 * It's a pure function — no sessionStorage, no I/O, no React. That means
 * both the client (at /checkout, before POSTing to /api/intake) and the
 * server (in the worker hydrator) can import and apply it consistently.
 *
 * Adding a new field?
 *   1. Add the form-key → canonical-key translation here.
 *   2. Update the IntakeData type in src/lib/intake-flow.ts if needed.
 *   3. Add a test case to mapToIntakeData if the transform is non-trivial.
 *
 * Idempotency:
 *   Calling mapToIntakeData on an already-mapped object is a no-op.
 *   `flat.dob === "1994-07-16"` survives untouched; the dateOfBirth
 *   branch only triggers if dateOfBirth is present. Same for arrays.
 */

export function mapToIntakeData(
  flat: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...flat }

  // ── DOB: "MM / DD / YYYY" (form) → "YYYY-MM-DD" (canonical / Healthie) ──
  if (typeof flat.dateOfBirth === 'string' && !out.dob) {
    const cleaned = flat.dateOfBirth.replace(/\s/g, '')
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(cleaned)
    if (m) {
      const [, mm, dd, yyyy] = m
      out.dob = `${yyyy}-${mm}-${dd}`
    }
  }

  // ── Boolean rename: smsConsent → smsOptIn ─────────────────────────────
  if (typeof flat.smsConsent === 'boolean' && out.smsOptIn === undefined) {
    out.smsOptIn = flat.smsConsent
  }

  // ── Multi-select strings → arrays ────────────────────────────────────
  // Step 3 saves goals as "weight-loss,energy-longevity" (comma-string)
  if (typeof flat.goals === 'string' && !Array.isArray(out.healthGoals)) {
    out.healthGoals = flat.goals
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  // Step 5 saves conditions as comma-string ('' or 'kidney,mtc')
  if (typeof flat.conditions === 'string' && !Array.isArray(out.medicalConditions)) {
    out.medicalConditions = flat.conditions
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  // Step 6 saves medications similarly (assumed comma-string)
  if (typeof flat.medications === 'string' && !Array.isArray(out.medications)) {
    out.medications = flat.medications
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  // q-prior-weight-management saves approaches as JSON-stringified array
  if (typeof flat.approaches === 'string' && !Array.isArray(out.priorWeightMgmt)) {
    try {
      const parsed = JSON.parse(flat.approaches)
      if (Array.isArray(parsed)) out.priorWeightMgmt = parsed
    } catch { /* leave as-is */ }
  }

  // ── Single-select renames ─────────────────────────────────────────────
  if (typeof flat.exercise === 'string' && !out.exerciseFrequency) {
    out.exerciseFrequency = flat.exercise
  }
  // sleepQuality, sleepHours, stressLevel, diet — names already match where
  // the corresponding step page uses them. Add more renames here as
  // discovered.

  return out
}
