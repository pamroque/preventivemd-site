'use client'

import { useRouter } from 'next/navigation'

function PencilSquareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      className="size-5 shrink-0 text-[#71717a]" aria-hidden="true">
      <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
      <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
    </svg>
  )
}

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
  const router = useRouter()
  return (
    <div className="flex flex-col gap-1.5 md:gap-3 items-end w-full">
      <div className="flex items-start gap-3 w-full">
        <p className="flex-1 text-sm md:text-base font-medium leading-6 text-[rgba(0,0,0,0.87)]">
          {step.question}
        </p>
        <button
          type="button"
          aria-label={`Edit answers for: ${step.question}`}
          onClick={() => router.push(step.editHref)}
          className="shrink-0 text-[#71717a] hover:text-[rgba(0,0,0,0.87)] transition-colors"
        >
          <PencilSquareIcon />
        </button>
      </div>
      <div className="flex flex-col gap-2 items-end w-full">
        {step.bubbles.map((bubble, bi) => (
          <div
            key={bi}
            className="px-4 py-2 rounded-full bg-[rgba(0,0,0,0.06)] text-sm text-[rgba(0,0,0,0.87)]"
            style={animateBubbles ? {
              animationName: 'fadeIn',
              animationDuration: '0.3s',
              animationDelay: `${(bubbleIndexOffset + bi) * 120}ms`,
              animationFillMode: 'both',
            } : undefined}
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