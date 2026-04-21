/**
 * BMI helper for the intake flow.
 * Step 2 captures height (feet + inches) and weight (lbs). Step 3's
 * "Support healthy weight management" card surfaces the BMI only when
 * it's >= 25, per design annotation on node 595:18113.
 */

export type BmiCategory =
  | 'Underweight'
  | 'Normal weight'
  | 'Overweight'
  | 'Class 1 Obesity'
  | 'Class 2 Obesity'
  | 'Class 3 Obesity'

export interface Bmi {
  value: number
  category: BmiCategory
  /** BMI >= 25 — the threshold that reveals the weight-management subtext */
  isOverweightOrAbove: boolean
}

function categorize(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal weight'
  if (bmi < 30) return 'Overweight'
  if (bmi < 35) return 'Class 1 Obesity'
  if (bmi < 40) return 'Class 2 Obesity'
  return 'Class 3 Obesity'
}

/**
 * Compute BMI from the exact string values step 2 persists.
 * Returns null if the inputs can't be parsed into a valid measurement.
 */
export function computeBmi(params: {
  heightFeet?: string | boolean
  heightInches?: string | boolean
  weight?: string | boolean
}): Bmi | null {
  const feet = Number(params.heightFeet)
  const inches = Number(params.heightInches)
  const weight = Number(params.weight)
  if (!Number.isFinite(feet) || !Number.isFinite(inches) || !Number.isFinite(weight)) return null
  const totalInches = feet * 12 + inches
  if (totalInches <= 0 || weight <= 0) return null
  const raw = (weight / (totalInches * totalInches)) * 703
  const value = Math.round(raw)
  return {
    value,
    category: categorize(raw),
    isOverweightOrAbove: raw >= 25,
  }
}
