'use client'

import TreatmentSelector from '@/components/ui/TreatmentSelector'

export default function DesiredTreatmentsPage() {
  return (
    <TreatmentSelector
      questionText="Are there specific treatments you'd like to ask about? *"
      stepIndex={12}
      backHref="/get-started/questionnaire/visit-type"
      nextHref="/get-started/questionnaire/book-consultation"
      progress={100}
      priorStepEditHref="/get-started/questionnaire/visit-type"
      escapeLabel="No, I have nothing specific in mind"
      cardVariant="plain"
    />
  )
}
