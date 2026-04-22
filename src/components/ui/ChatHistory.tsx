'use client'

export interface PriorStep {
  question: string
  bubbles: string[]
  editHref: string
}

function StepBlock({
  step,
  animateBubbles,
  bubbleIndexOffset = 0,
}: {
  step: PriorStep
  animateBubbles: boolean
  bubbleIndexOffset?: number
}) {
  return (
    <div className="flex flex-col gap-1.5 md:gap-3 items-end w-full">
      <div className="flex items-start gap-3 w-full">
        <p className="flex-1 text-sm md:text-base font-medium leading-6 text-[rgba(0,0,0,0.87)]">
          {step.question.replace(/ \*$/, '')}
        </p>
      </div>
      <div className="flex flex-col gap-2 items-end w-full">
        {step.bubbles.map((bubble, bi) => (
          <div
            key={bi}
            className="px-4 py-2 rounded-full bg-[rgba(0,0,0,0.06)] text-sm text-[rgba(0,0,0,0.87)] transition-all duration-500"
            style={animateBubbles ? {
              opacity: 1,
              transform: 'translateY(0)',
              transitionDelay: `${(bubbleIndexOffset + bi) * 120}ms`,
            } : {
              opacity: 0,
              transform: 'translateY(6px)',
            }}
          >
            {bubble}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ChatHistoryProps {
  historicSteps: PriorStep[]
  currentStep: PriorStep | null
  animateCurrentStep: boolean
}

export default function ChatHistory({
  historicSteps,
  currentStep,
  animateCurrentStep,
}: ChatHistoryProps) {
  if (!historicSteps.length && !currentStep) return null

  return (
    <div className="flex flex-col gap-6 w-full">
      {currentStep && (
        <StepBlock
          step={currentStep}
          animateBubbles={animateCurrentStep}
          bubbleIndexOffset={0}
        />
      )}
    </div>
  )
}

/**
 * Calculate total animation duration for a step's bubbles so the next
 * component can start Eve's typing after it finishes.
 */
export function currentStepAnimDuration(bubbleCount: number): number {
  return bubbleCount * 120 + 500
}