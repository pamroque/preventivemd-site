// Patient-selected unit system for height + weight inputs across the
// intake flow. Captured on step-2 alongside the body measurements and
// read by every other page that asks for weight (q-target-weight,
// step-4 weight lost). Storage stays canonical-imperial so BMI math
// and the backend (api/intake) don't have to branch — we save the
// metric originals separately for the form-roundtrip on back-nav.

import { getStepValues } from './intake-session-store'

export type UnitSystem = 'imperial' | 'metric'

/** Step-2 is saved at session index 1. */
const STEP2_INDEX = 1

/** Reads the user's saved unit preference. Defaults to imperial when no
 *  preference has been saved (older sessions, direct deep-links). */
export function getSavedUnitSystem(): UnitSystem {
  const v = getStepValues(STEP2_INDEX)
  return v.units === 'metric' ? 'metric' : 'imperial'
}

/** Convert centimeters to imperial feet+inches, rounding inches to the
 *  nearest whole inch. Inches saturate at 11 — if rounding would push
 *  to 12, we carry into feet. */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  if (!Number.isFinite(cm) || cm <= 0) return { feet: 0, inches: 0 }
  const totalInches = cm / 2.54
  let feet = Math.floor(totalInches / 12)
  let inches = Math.round(totalInches - feet * 12)
  if (inches >= 12) {
    feet += 1
    inches = 0
  }
  return { feet, inches }
}

/** Convert kilograms to pounds. Returns a rounded integer to match the
 *  imperial weight inputs across the intake flow. */
export function kgToLbs(kg: number): number {
  if (!Number.isFinite(kg) || kg <= 0) return 0
  return Math.round(kg / 0.453592)
}

/** Convert pounds to kilograms. */
export function lbsToKg(lbs: number): number {
  if (!Number.isFinite(lbs) || lbs <= 0) return 0
  return Math.round(lbs * 0.453592 * 10) / 10
}

/** Render a height bubble in the user's preferred units. */
export function formatHeightBubble(opts: {
  units:        UnitSystem
  heightFeet?:  string | boolean
  heightInches?:string | boolean
  heightCm?:    string | boolean
}): string {
  if (opts.units === 'metric' && typeof opts.heightCm === 'string') {
    return `${opts.heightCm} cm`
  }
  const ft = typeof opts.heightFeet === 'string' ? opts.heightFeet : ''
  const inch = typeof opts.heightInches === 'string' ? opts.heightInches : ''
  return `${ft}ft ${inch}in`
}

/** Render a weight bubble in the user's preferred units. */
export function formatWeightBubble(opts: {
  units:    UnitSystem
  weight?:  string | boolean
  weightKg?:string | boolean
}): string {
  if (opts.units === 'metric' && typeof opts.weightKg === 'string') {
    return `${opts.weightKg} kg`
  }
  const w = typeof opts.weight === 'string' ? opts.weight : ''
  return `${w} lbs`
}
