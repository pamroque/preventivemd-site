/**
 * Lightweight intake session store backed by sessionStorage.
 * Each step saves its answers here; the next step reads them back
 * to render the chat history bubbles.
 */

export interface StepAnswers {
  /** Human-readable question label shown in chat history */
  question: string
  /** One bubble string per field answered on that step */
  bubbles: string[]
}

const STORAGE_KEY = 'pmd_intake'

export interface IntakeSession {
  steps: StepAnswers[]
  /** Persisted form values keyed by step index */
  values: Record<number, Record<string, string | boolean>>
}

function load(): IntakeSession {
  if (typeof window === 'undefined') return { steps: [], values: {} }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { steps: [], values: {} }
  } catch {
    return { steps: [], values: {} }
  }
}

function save(session: IntakeSession) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

/** Save a completed step's answers and values */
export function saveStep(
  stepIndex: number,
  answers: StepAnswers,
  values: Record<string, string | boolean>
) {
  const session = load()
  session.steps[stepIndex] = answers
  session.values[stepIndex] = values
  save(session)
}

/** Get all prior steps' Q&A for chat history rendering */
export function getPriorSteps(upToIndex: number): StepAnswers[] {
  const session = load()
  // Include the get-started intro (stored at slot 99) first, then numbered steps
  const intro = session.steps[99] ? [session.steps[99]] : []
  const numbered = session.steps.slice(0, upToIndex)
  return [...intro, ...numbered]
}

/** Get saved form values for a specific step (for pre-filling on back navigation) */
export function getStepValues(stepIndex: number): Record<string, string | boolean> {
  const session = load()
  return session.values[stepIndex] ?? {}
}

/** Get a single saved value across all steps */
export function getSavedValue(stepIndex: number, field: string): string | boolean | undefined {
  return getStepValues(stepIndex)[field]
}

/** Clear the entire session (e.g. on final submission) */
export function clearSession() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}

/** Clear a range of step indices (e.g. goal-question slots when goals change) */
export function clearStepRange(from: number, to: number) {
  if (typeof window === 'undefined') return
  const session = load()
  for (let i = from; i <= to; i++) {
    delete session.steps[i]
    delete session.values[i]
  }
  save(session)
}
