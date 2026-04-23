'use client'

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
 * The "Start medical questionnaire" button on the get-started page.
 * Saves the get-started Q&A as step 0 in the session store so it
 * appears in the chat history on step 1.
 *
 * The optional `peptide` prop carries the treatment highlight from the
 * `/treatments/[slug]?peptide=...` entry point so the choose-treatments
 * page can pre-check the corresponding card.
 */
export default function StartQuestionnaireButton({ peptide }: { peptide?: string }) {
  const router = useRouter()

  function handleClick() {
    saveStep(
      99,
      {
        question: "Hi, I'm Eve, and I'll be your concierge. Getting started is simple.",
        bubbles: ['Agree to Terms & Conditions and acknowledge Privacy Policy'],
      },
      peptide ? { peptide } : {}
    )
    router.push('/get-started/questionnaire')
  }

  return (
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
  )
}
