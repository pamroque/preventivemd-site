'use client'

import TreatmentSelector from '@/components/ui/TreatmentSelector'

export default function DesiredTreatmentsPage() {
  return (
    <TreatmentSelector
      questionText="Are there specific treatments you'd like to ask about? *"
      stepIndex={13}
      backHref="/get-started/questionnaire/book-consultation"
      nextHref="/get-started/questionnaire/checkout"
      progress={100}
      priorStepEditHref="/get-started/questionnaire/book-consultation"
      escapeLabel="No, I have nothing specific in mind"
      cardVariant="plain"
    />
  )
}
