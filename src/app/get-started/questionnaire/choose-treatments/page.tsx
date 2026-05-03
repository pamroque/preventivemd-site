'use client'

import TreatmentSelector from '@/components/ui/TreatmentSelector'
import DisqualificationGate from '@/components/ui/DisqualificationGate'

export default function ChooseTreatmentsPage() {
  return (
    <>
      <DisqualificationGate />
      <TreatmentSelector
        questionText="Which treatments would you like to request? *"
        stepIndex={14}
        backHref="/get-started/questionnaire/visit-type"
        nextHref="/get-started/questionnaire/choose-medications"
        progress={80}
        priorStepEditHref="/get-started/questionnaire/visit-type"
        checkIneligibility
        cardVariant="gradient"
      />
    </>
  )
}
