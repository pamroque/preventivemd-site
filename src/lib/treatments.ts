export interface Treatment {
  id: string
  name: string
  description: string
  boldFirstSentence?: boolean
}

export const TREATMENTS: readonly Treatment[] = [
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    description: 'Starting at $99/mo. A copper-binding peptide found in the body, studied for its role in skin and tissue health.',
    boldFirstSentence: true,
  },
  {
    id: 'glp-1',
    name: 'GLP-1',
    description: 'Examples include Semaglutide and Tirzepatide. Builds on natural hormones involved in appetite and metabolic regulation.',
    boldFirstSentence: true,
  },
  {
    id: 'glutathione',
    name: 'Glutathione',
    description: 'Starting at $99/mo. An antioxidant the body produces, involved in cellular and metabolic processes.',
    boldFirstSentence: true,
  },
  {
    id: 'nad-plus',
    name: 'NAD+',
    description: 'Starting at $99/mo. A coenzyme found in every cell, central to energy metabolism and cellular function.',
    boldFirstSentence: true,
  },
  {
    id: 'sermorelin',
    name: 'Sermorelin',
    description: "Starting at $99/mo. Builds on GHRH, the body's natural signal for growth hormone release.",
    boldFirstSentence: true,
  },
] as const

// Entry-point peptide name → treatment id on the selector page.
export const PEPTIDE_TO_TREATMENT_ID: Record<string, string> = {
  Semaglutide: 'glp-1',
  Tirzepatide: 'glp-1',
  'NAD+': 'nad-plus',
  Sermorelin: 'sermorelin',
  Glutathione: 'glutathione',
}

// Step-3 health goal id → treatment ids that earn the GOAL MATCH badge.
export const GOAL_TO_TREATMENTS: Record<string, readonly string[]> = {
  weight: ['glp-1', 'aod-9604'],
  sleep: ['epitalon', 'pinealon', 'dsip'],
  stress: ['selank'],
  energy: ['nad-plus', 'glutathione', 'ss-31', 'mots-c'],
  focus: ['semax', 'dihexa'],
  inflammation: ['ghk-cu', 'thymosin-alpha-1', 'bpc-157', 'tb-500', 'kpv'],
  recovery: ['sermorelin', 'tesamorelin', 'cjc-1295', 'ipamorelin', 'igf-1-lr3'],
  sexual: ['pt-141'],
}

// Treatment id → step-5 condition ids that make it ineligible (request flow only).
export const TREATMENT_INELIGIBILITY: Record<string, readonly string[]> = {
  'glp-1': ['mtc', 'men2'],
}
