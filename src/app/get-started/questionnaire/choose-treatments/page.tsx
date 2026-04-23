'use client'

import TreatmentSelector from '@/components/ui/TreatmentSelector'

export default function ChooseTreatmentsPage() {
  return (
    <TreatmentSelector
      questionText="Which treatments would you like to request? *"
      stepIndex={12}
      backHref="/get-started/questionnaire/visit-type"
      nextHref="/get-started/questionnaire/choose-medications"
      progress={65}
      priorStepEditHref="/get-started/questionnaire/visit-type"
      checkIneligibility
      cardVariant="gradient"
    />
  )
}
