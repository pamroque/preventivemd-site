/**
 * Manifest for approach-specific supplemental questions.
 * Triggered by which approaches were selected in q-prior-weight-management.
 * Array order defines the presentation sequence.
 *
 * To add a new approach sub-question: add one entry here. Nothing else changes.
 */

import { getStepValues } from './intake-session-store'

const PRIOR_WEIGHT_MGMT_INDEX = 51

export interface ApproachSubquestion {
  approachId: string
  route: string
  sessionIndex: number
}

export const APPROACH_SUBQUESTIONS: ApproachSubquestion[] = [
  {
    approachId: 'glp1-medication',
    route: '/get-started/questionnaire/q-prior-glp1-history',
    sessionIndex: 52,
  },
  {
    approachId: 'glp1-medication',
    route: '/get-started/questionnaire/q-prior-glp1-reactions',
    sessionIndex: 53,
  },
  {
    approachId: 'weight-loss-surgery',
    route: '/get-started/questionnaire/q-prior-surgery-type',
    sessionIndex: 54,
  },
]

/** Parse selected approaches from q-prior-weight-management session data */
export function getSelectedApproaches(): string[] {
  const s = getStepValues(PRIOR_WEIGHT_MGMT_INDEX)
  if (typeof s.approaches !== 'string') return []
  try { return JSON.parse(s.approaches) as string[] } catch { return [] }
}

/** Ordered list of approach sub-questions applicable to the given selections */
export function getApproachSubquestionSequence(selectedApproaches: string[]): ApproachSubquestion[] {
  return APPROACH_SUBQUESTIONS.filter(q => selectedApproaches.includes(q.approachId))
}

/** Next route from a given approach sub-question page; falls back to `fallback` at end of sequence */
export function getNextApproachRoute(currentRoute: string, selectedApproaches: string[], fallback: string): string {
  const seq = getApproachSubquestionSequence(selectedApproaches)
  const idx = seq.findIndex(q => q.route === currentRoute)
  if (idx === -1 || idx === seq.length - 1) return fallback
  return seq[idx + 1].route
}

/** Previous route from a given approach sub-question page */
export function getPrevApproachRoute(currentRoute: string, selectedApproaches: string[]): string {
  const seq = getApproachSubquestionSequence(selectedApproaches)
  const idx = seq.findIndex(q => q.route === currentRoute)
  if (idx <= 0) return '/get-started/questionnaire/q-prior-weight-management'
  return seq[idx - 1].route
}
