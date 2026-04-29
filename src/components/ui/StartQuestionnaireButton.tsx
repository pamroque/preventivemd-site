'use client'

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveStep } from '@/lib/intake-session-store'

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 shrink-0" aria-hidden="true">
      <path fillRule="evenodd"
        d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd" />
    </svg>
  )
}

/**
 * The "Start medical questionnaire" CTA on the get-started page. Renders the
 * required Consumer Health Data consent checkbox immediately above the button.
 * If the user clicks the button without consenting, an inline error is shown
 * and focus moves to the checkbox so AT users hear the requirement.
 *
 * The optional `peptide` prop carries the treatment highlight from the
 * `/treatments/[slug]?peptide=...` entry point so the choose-treatments
 * page can pre-check the corresponding card.
 */
export default function StartQuestionnaireButton({ peptide }: { peptide?: string }) {
  const router = useRouter()
  const [consented, setConsented] = useState(false)
  const [showError, setShowError] = useState(false)
  const checkboxId = useId()
  const errorId = `${checkboxId}-error`
  const checkboxRef = useRef<HTMLInputElement>(null)

  function handleConsentChange(checked: boolean) {
    setConsented(checked)
    if (checked) setShowError(false)
  }

  function handleClick() {
    if (!consented) {
      setShowError(true)
      checkboxRef.current?.focus()
      return
    }
    saveStep(
      99,
      {
        question: "Hi, I'm Eve, and I'll be your concierge. Getting started is simple.",
        bubbles: [
          'I consent to the collection and processing of my consumer health data as described in the Consumer Health Data Privacy Policy.',
        ],
      },
      peptide ? { peptide, healthDataConsent: true } : { healthDataConsent: true }
    )
    router.push('/get-started/questionnaire')
  }

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-5 w-4 shrink-0">
            <input
              ref={checkboxRef}
              id={checkboxId}
              type="checkbox"
              checked={consented}
              onChange={(e) => handleConsentChange(e.target.checked)}
              className={`size-4 rounded accent-[#0778ba] focus-visible:ring-2 focus-visible:ring-[#0778ba] cursor-pointer ${
                showError ? 'border-2 border-red-600' : 'border border-[#e4e4e7]'
              }`}
              aria-required="true"
              aria-invalid={showError}
              aria-describedby={showError ? errorId : undefined}
            />
          </div>
          <label
            htmlFor={checkboxId}
            className="flex-1 text-sm font-medium leading-5 text-[#71717a] cursor-pointer"
          >
            I consent to the collection and processing of my consumer health data
            as described in the{' '}
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0778ba] underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              Consumer Health Data Privacy Policy
            </a>
            . <span className="text-red-600" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
        </div>
        {showError && (
          <p id={errorId} className="text-xs text-red-600 leading-4 ml-7" role="alert">
            You must consent before continuing.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleClick}
        className="
          relative flex items-center justify-center gap-3
          w-full h-[42px] px-4 py-2 overflow-hidden
          rounded-tl-[36px] rounded-br-[36px] rounded-tr-none rounded-bl-none
          text-white text-base font-medium leading-6 whitespace-nowrap
          transition-opacity hover:opacity-90
          shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
        "
        style={{
          background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)',
        }}
      >
        Start medical questionnaire
        <ChevronRightIcon />
      </button>
    </div>
  )
}
