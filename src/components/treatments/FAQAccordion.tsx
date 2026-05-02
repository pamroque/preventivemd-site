'use client'

/*
 * FAQAccordion.tsx — Collapsible FAQ items
 *
 * KEY CONCEPT: 'use client' for interactivity
 *
 * In your HTML: onclick="this.parentElement.classList.toggle('open')"
 * In React: useState to track which FAQ is open, and conditional rendering.
 *
 * The React way is better because:
 * 1. State is explicit — you can see which item is open in devtools
 * 2. Only one item open at a time (easy to implement)
 * 3. Animations can be managed properly
 * 4. It's testable — you can write unit tests for this
 */

import { useState } from 'react'

type FAQ = { q: string; a: string }

export function FAQAccordion({ faqs }: { faqs: FAQ[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i

        return (
          <div
            key={i}
            className="border border-border rounded-xl overflow-hidden bg-white"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-bg/50 transition-colors"
            >
              <span className="text-sm font-medium text-brand-navy pr-4">{faq.q}</span>
              <svg
                className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Answer — conditional rendering */}
            {isOpen && (
              <div className="px-5 pb-4">
                <p className="text-xs text-muted font-light leading-relaxed">
                  {faq.a}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
