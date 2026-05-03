'use client'

import { useMemo, useState } from 'react'

// Inline BMI calculator for the Eligibility section. Patients see where
// they land relative to the standard WHO categories. Results are a
// starting point only — the eligibility cards above remain the source
// of truth and the disclaimer below makes that clear.

type UnitSystem = 'imperial' | 'metric'

type BmiCategory = {
  label:    string
  textCls:  string
  bgCls:    string
}

function getCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return { label: 'Underweight',   textCls: 'text-[#92400e]', bgCls: 'bg-[#fef3c7]' }
  if (bmi < 25)   return { label: 'Normal weight', textCls: 'text-[#065f46]', bgCls: 'bg-[#d1fae5]' }
  if (bmi < 30)   return { label: 'Overweight',    textCls: 'text-[#92400e]', bgCls: 'bg-[#fef3c7]' }
  return                { label: 'Obese',          textCls: 'text-[#991b1b]', bgCls: 'bg-[#fee2e2]' }
}

const inputBase =
  'w-full h-[42px] px-3 py-1.5 bg-white border border-[#e4e4e7] rounded-lg shadow-sm ' +
  'text-base text-[rgba(0,0,0,0.87)] placeholder:text-[#71717a] ' +
  'focus:outline-none focus:border-brand-blue transition-colors'

export default function BmiCalculator() {
  const [units, setUnits] = useState<UnitSystem>('imperial')
  const [feet, setFeet]   = useState('')
  const [inches, setInches] = useState('')
  const [cm, setCm]       = useState('')
  const [lbs, setLbs]     = useState('')
  const [kg, setKg]       = useState('')

  // Derive height in cm + weight in kg from whichever fields are active.
  // Anything missing or non-numeric → null, which suppresses the result.
  const bmi = useMemo<number | null>(() => {
    let heightCm: number | null = null
    let weightKg: number | null = null

    if (units === 'imperial') {
      const ft = parseFloat(feet)
      const inch = parseFloat(inches || '0')
      const lb = parseFloat(lbs)
      if (!Number.isFinite(ft) || ft <= 0 || !Number.isFinite(lb) || lb <= 0) return null
      heightCm = (ft * 12 + inch) * 2.54
      weightKg = lb * 0.453592
    } else {
      const c = parseFloat(cm)
      const k = parseFloat(kg)
      if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(k) || k <= 0) return null
      heightCm = c
      weightKg = k
    }

    const m = heightCm / 100
    const value = weightKg / (m * m)
    if (!Number.isFinite(value) || value <= 0 || value > 100) return null
    return Math.round(value * 10) / 10
  }, [units, feet, inches, cm, lbs, kg])

  const category = bmi != null ? getCategory(bmi) : null

  return (
    <section
      aria-labelledby="bmi-heading"
      className="flex flex-col gap-5 rounded-2xl border border-[#e4e4e7] bg-white p-6 md:p-8"
    >
      <div className="flex flex-col gap-1.5">
        <h3 id="bmi-heading" className="text-base font-medium leading-6 text-[#09090b]">
          Calculate your BMI
        </h3>
        <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
          A starting point your provider considers alongside your full health profile.
        </p>
      </div>

      {/* Unit toggle */}
      <div
        role="radiogroup"
        aria-label="Units"
        className="flex h-10 w-full max-w-[280px] rounded-lg border border-[#e4e4e7] overflow-hidden shadow-sm"
      >
        {(['imperial', 'metric'] as const).map((u) => {
          const active = units === u
          return (
            <label
              key={u}
              className={`relative flex-1 flex items-center justify-center cursor-pointer text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#3b82f6] has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:z-10 ${
                active ? 'bg-brand-blue text-white' : 'bg-white text-[rgba(0,0,0,0.6)] hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="bmi-units"
                value={u}
                checked={active}
                onChange={() => setUnits(u)}
                className="sr-only"
              />
              {u === 'imperial' ? 'ft / lbs' : 'cm / kg'}
            </label>
          )
        })}
      </div>

      {/* Inputs */}
      {units === 'imperial' ? (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="bmi-feet" className="text-sm font-medium text-[#09090b] leading-5">
                Height (ft)
              </label>
              <input
                id="bmi-feet"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="5"
                value={feet}
                onChange={(e) => setFeet(e.target.value)}
                className={inputBase}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor="bmi-inches" className="text-sm font-medium text-[#09090b] leading-5">
                Height (in)
              </label>
              <input
                id="bmi-inches"
                type="number"
                inputMode="numeric"
                min="0"
                max="11"
                step="1"
                placeholder="9"
                value={inches}
                onChange={(e) => setInches(e.target.value)}
                className={inputBase}
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label htmlFor="bmi-lbs" className="text-sm font-medium text-[#09090b] leading-5">
              Weight (lbs)
            </label>
            <input
              id="bmi-lbs"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="160"
              value={lbs}
              onChange={(e) => setLbs(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 flex flex-col gap-1.5">
            <label htmlFor="bmi-cm" className="text-sm font-medium text-[#09090b] leading-5">
              Height (cm)
            </label>
            <input
              id="bmi-cm"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="175"
              value={cm}
              onChange={(e) => setCm(e.target.value)}
              className={inputBase}
            />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label htmlFor="bmi-kg" className="text-sm font-medium text-[#09090b] leading-5">
              Weight (kg)
            </label>
            <input
              id="bmi-kg"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="73"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
      )}

      {/* Result */}
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
          bmi != null ? 'border-[#e4e4e7] bg-brand-cream/40' : 'border-dashed border-[#e4e4e7] bg-white'
        }`}
      >
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium tracking-[1.5px] uppercase leading-4 text-[rgba(0,0,0,0.45)]">
            Your BMI
          </p>
          <p className="text-2xl font-normal leading-8 tracking-[-0.6px] text-[#09090b]">
            {bmi != null ? bmi.toFixed(1) : '—'}
          </p>
        </div>
        {category && (
          <span
            className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-[1px] ${category.bgCls} ${category.textCls}`}
          >
            {category.label}
          </span>
        )}
      </div>

      <p className="text-xs leading-4 text-[rgba(0,0,0,0.6)]">
        BMI is a screening tool, not a diagnosis. Your provider will review your full health
        profile during the intake to determine eligibility.
      </p>
    </section>
  )
}
