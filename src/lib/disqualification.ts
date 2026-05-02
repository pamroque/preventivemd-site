/*
 * disqualification.ts — Intake-flow disqualification rules.
 *
 * Some answers in the questionnaire (currently: certain medical conditions
 * at step-5) make a patient ineligible for our care. Historically the
 * step-5 page rerouted to /disqualification *immediately* on selection,
 * which felt abrupt — the patient had no chance to finish their answers.
 *
 * The new behavior defers the decision: every disqualifying answer is
 * still saved, but the user proceeds through the rest of the
 * questionnaire as normal. After the last question (step-11, stress
 * level), this helper is consulted; if any disqualifying answer is
 * present, the user is routed to /disqualification instead of
 * /visit-type.
 *
 * Adding a new disqualification rule:
 *   1. If it's another condition checkbox, add the ID to
 *      DISQUALIFYING_CONDITION_IDS below.
 *   2. If it's an answer on a different step, add a new branch to
 *      `isIntakeDisqualified()` that reads that step's saved values.
 *   3. Update the disqualifying option's `disqualifying: true` flag in
 *      the source page so the data still self-describes.
 */

import { getStepValues } from './intake-session-store'

/**
 * IDs from the step-5 conditions list that disqualify a patient.
 * Mirrors the `disqualifying: true` flag on those entries in
 * `src/app/get-started/questionnaire/step-5/page.tsx`. Keep these in
 * lockstep — the page still uses the per-condition flag for clarity,
 * but routing decisions consult this list.
 */
export const DISQUALIFYING_CONDITION_IDS: ReadonlyArray<string> = [
  'pregnancy',
]

const DISQUALIFYING_CONDITION_IDS_SET = new Set<string>(DISQUALIFYING_CONDITION_IDS)

/**
 * Returns true if the patient's saved answers contain any disqualifying
 * response. Reads from sessionStorage via the intake-session-store; safe
 * to call only on the client (gated by `typeof window` inside the
 * underlying helper).
 */
export function isIntakeDisqualified(): boolean {
  // Step-5 saves at index 4. `conditions` is a comma-separated string of
  // selected condition IDs ('' when "None" was selected).
  const s4 = getStepValues(4)
  const conditionsRaw = typeof s4.conditions === 'string' ? s4.conditions : ''
  if (conditionsRaw) {
    const ids = conditionsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.some((id) => DISQUALIFYING_CONDITION_IDS_SET.has(id))) return true
  }

  // Future disqualifying answers from other steps would be checked here.

  return false
}
