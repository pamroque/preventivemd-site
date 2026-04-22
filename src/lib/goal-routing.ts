/**
 * Central manifest for goal-specific supplemental questions.
 *
 * Each entry declares:
 *   route        — the page URL (named by content, not by triggering goal)
 *   goals        — goal IDs from step-3 that trigger this question
 *   sessionIndex — storage slot (reserved range: 50–89)
 *
 * To add a new goal question: add one entry here. Nothing else needs to change.
 */

import { getStepValues, clearStepRange } from './intake-session-store'

const STEP3_INDEX = 2

export const GOAL_QUESTION_INDEX_MIN = 50
export const GOAL_QUESTION_INDEX_MAX = 89

/** The route that follows all goal-specific questions */
export const AFTER_GOAL_QUESTIONS = '/get-started/questionnaire/step-4'

export interface GoalQuestion {
  route: string
  goals: string[]
  sessionIndex: number
}

export const GOAL_QUESTIONS: GoalQuestion[] = [
  {
    route: '/get-started/questionnaire/q-target-weight',
    goals: ['weight'],
    sessionIndex: 50,
  },
  {
    route: '/get-started/questionnaire/q-prior-weight-management',
    goals: ['weight'],
    sessionIndex: 51,
  },
]

/** Parse the selected goals from step-3's session data */
export function getSelectedGoals(): string[] {
  const s = getStepValues(STEP3_INDEX)
  return typeof s.goals === 'string' ? s.goals.split(',').filter(Boolean) : []
}

/** Ordered list of goal questions applicable to the given selected goals */
export function getGoalQuestionSequence(selectedGoals: string[]): GoalQuestion[] {
  return GOAL_QUESTIONS.filter(q => q.goals.some(g => selectedGoals.includes(g)))
}

/** First route after step-3 — either first goal question or step-4 */
export function getFirstGoalQuestionRoute(selectedGoals: string[]): string {
  return getGoalQuestionSequence(selectedGoals)[0]?.route ?? AFTER_GOAL_QUESTIONS
}

/** Next route from a given goal question page */
export function getNextGoalRoute(currentRoute: string, selectedGoals: string[]): string {
  const seq = getGoalQuestionSequence(selectedGoals)
  const idx = seq.findIndex(q => q.route === currentRoute)
  if (idx === -1 || idx === seq.length - 1) return AFTER_GOAL_QUESTIONS
  return seq[idx + 1].route
}

/** Previous route from a given goal question page */
export function getPrevGoalRoute(currentRoute: string, selectedGoals: string[]): string {
  const seq = getGoalQuestionSequence(selectedGoals)
  const idx = seq.findIndex(q => q.route === currentRoute)
  if (idx <= 0) return '/get-started/questionnaire/step-3'
  return seq[idx - 1].route
}

/** Back href for step-4: last goal question if any, otherwise step-3 */
export function getStep4BackHref(): string {
  const goals = getSelectedGoals()
  const seq = getGoalQuestionSequence(goals)
  return seq.length > 0 ? seq[seq.length - 1].route : '/get-started/questionnaire/step-3'
}

/** Wipe goal-question session data (call when step-3 is resubmitted) */
export function clearGoalQuestionData() {
  clearStepRange(GOAL_QUESTION_INDEX_MIN, GOAL_QUESTION_INDEX_MAX)
}
