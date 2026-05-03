// Shared form-factor source of truth.
//
// Used by:
//   • /get-started/questionnaire/choose-medications/page.tsx — form pickers
//   • /treatments/[slug]/page.tsx — "How is it typically taken" section
//
// Adding a new form factor here automatically surfaces it in both flows.
// Keeping these in one module means we never drift between the picker and
// the marketing pages.

import type { ReactNode } from 'react'

export type MedForm = 'injection' | 'oral' | 'kwikpen' | 'pen' | 'cream'

export interface FormOption {
  id:    MedForm
  label: string
  // ReactNode rather than `string` so a sub can include inline markup
  // (e.g. a superscript dagger that ties to a price footnote).
  sub?:  ReactNode
}

export const FORM_LABELS: Record<MedForm, string> = {
  injection: 'Injection vials',
  oral:      'Pills',
  kwikpen:   'KwikPen®',
  pen:       'Injection pens',
  cream:     'Cream',
}

// Per-treatment form options (non-GLP-1).
export const FORM_OPTIONS_BY_TREATMENT: Record<string, FormOption[]> = {
  'ghk-cu':      [{ id: 'cream',     label: 'Cream',           sub: 'Once or twice daily' }],
  'sermorelin':  [{ id: 'injection', label: 'Injection vials', sub: 'Once weekly' }],
  'glutathione': [{ id: 'injection', label: 'Injection vials', sub: 'Once weekly' }],
  'nad-plus':    [{ id: 'injection', label: 'Injection vials', sub: 'Once weekly' }],
}

export type Glp1Type = 'semaglutide' | 'tirzepatide' | 'foundayo' | 'wegovy' | 'zepbound'

// Per-GLP-1-type form options.
export const GLP1_FORM_OPTIONS_BY_TYPE: Record<Glp1Type, FormOption[]> = {
  semaglutide: [
    { id: 'injection', label: 'Injection vials', sub: 'Once weekly' },
    { id: 'oral',      label: 'Pills',           sub: 'Once daily' },
  ],
  tirzepatide: [
    { id: 'injection', label: 'Injection vials', sub: 'Once weekly' },
    { id: 'oral',      label: 'Pills',           sub: 'Once daily' },
  ],
  foundayo: [
    { id: 'oral',      label: 'Pills',           sub: 'Once daily' },
  ],
  wegovy: [
    { id: 'pen',       label: 'Injection pens',  sub: 'Once weekly' },
    { id: 'oral',      label: 'Pills',           sub: 'Once daily' },
  ],
  zepbound: [
    { id: 'injection', label: 'Injection vials', sub: 'Once weekly' },
    { id: 'kwikpen',   label: 'KwikPen®',        sub: 'Once weekly' },
  ],
}

// Original choose-medications helper — kept here so the questionnaire
// imports without changing call sites.
export function getFormOptions(treatmentId: string, glp1Type: Glp1Type | null): FormOption[] {
  if (treatmentId === 'glp-1') {
    return glp1Type ? GLP1_FORM_OPTIONS_BY_TYPE[glp1Type] : []
  }
  return FORM_OPTIONS_BY_TREATMENT[treatmentId] ?? []
}

// ─── Treatment-page helpers ──────────────────────────────────────────────
//
// Treatment marketing pages use a flat `slug` (e.g. 'nad', 'semaglutide')
// while the questionnaire splits GLP-1s under one treatment id with a
// `type` qualifier and uses 'nad-plus' for NAD+. This map bridges the two.

const SLUG_TO_FORM_LOOKUP: Record<string, { treatmentId: string; glp1Type: Glp1Type | null }> = {
  glutathione:  { treatmentId: 'glutathione', glp1Type: null },
  'ghk-cu':     { treatmentId: 'ghk-cu',      glp1Type: null },
  nad:          { treatmentId: 'nad-plus',    glp1Type: null },
  sermorelin:   { treatmentId: 'sermorelin',  glp1Type: null },
  semaglutide:  { treatmentId: 'glp-1',       glp1Type: 'semaglutide' },
  tirzepatide:  { treatmentId: 'glp-1',       glp1Type: 'tirzepatide' },
  foundayo:     { treatmentId: 'glp-1',       glp1Type: 'foundayo' },
  wegovy:       { treatmentId: 'glp-1',       glp1Type: 'wegovy' },
  zepbound:     { treatmentId: 'glp-1',       glp1Type: 'zepbound' },
}

/** Forms PreventiveMD currently offers for a given marketing slug. */
export function getOfferedFormOptionsBySlug(slug: string): FormOption[] {
  const lookup = SLUG_TO_FORM_LOOKUP[slug]
  if (!lookup) return []
  return getFormOptions(lookup.treatmentId, lookup.glp1Type)
}
