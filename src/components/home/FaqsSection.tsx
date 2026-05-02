'use client'

import { type ReactNode, useEffect, useState } from 'react'

/** Heroicons-mini/chevron-down */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? 'size-5'}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

type Faq = {
  /** Used as the deep-link anchor (e.g. `#faq-503a-pharmacies`). */
  slug: string
  q: string
  /** A single node renders as one paragraph; pass an array for multiple.
   *  Each entry may be a plain string or inline JSX (e.g. emphasis spans). */
  a: ReactNode | ReactNode[]
}

const FAQS: Faq[] = [
  {
    slug: '503a-pharmacies',
    q: 'What are 503A pharmacies?',
    a: [
      'Most medications you get at a CVS or Walgreens are mass-produced, with millions of identical pills made in factories.',
      "503A pharmacies are different. They prepare medications individually, based on a provider's prescription, for a specific patient. They're licensed by state pharmacy boards and must follow USP (United States Pharmacopeia) quality standards, which are the same standards that govern hospital and retail pharmacy compounding.",
    ],
  },
  {
    slug: 'peptide-safety',
    q: 'Are peptides safe?',
    a: [
      'Peptides have been studied for decades and many are well-tolerated when prescribed and dispensed properly. That said, no medication is universally safe — it depends on the specific peptide, the dose, your medical history, and the quality of the source.',
      "That's why we work exclusively with licensed providers who review your full health profile before prescribing, and with state-licensed 503A pharmacies. If a peptide isn't right for you, we'll tell you.",
    ],
  },
  {
    slug: 'side-effects',
    q: 'What are common side effects? What if I have a bad reaction?',
    a: [
      'Common side effects vary by medication. Your provider will walk through what to expect for your specific protocol once they review your information. You will also be able to see this information in your Care Portal.',
      'If you experience a concerning reaction, message your care team — they respond within 24 hours, or sooner for urgent symptoms.',
      <span className="text-red-600">
        For severe reactions (difficulty breathing, swelling, or signs of an allergic response), seek emergency care first, then let us know.
      </span>,
    ],
  },
  {
    slug: 'fda-approval',
    q: 'Are these treatments FDA-approved?',
    a: [
      "It depends on the medication. Branded options like Foundayo®, Wegovy®, and Zepbound® are FDA-approved. The rest of the compounded medication we offer are not. They're prepared individually by state-licensed 503A pharmacies we work with, using FDA-regulated active ingredients and based on a provider's prescription for a specific patient.",
      '503A compounding is a long-established part of U.S. healthcare, regulated by state pharmacy boards under USP (United States Pharmacopeia) standards.',
    ],
  },
  {
    slug: 'insurance-coverage',
    q: 'Will my insurance cover this?',
    a: [
      "Most of the protocols we offer aren't covered by insurance, and we don't bill insurance directly. You pay one upfront price for your medication and provider consultation — no surprise fees, no claims to chase.",
      "If you'd like to seek reimbursement, we can provide receipts you can submit to your insurer or HSA/FSA, though we can't guarantee coverage.",
    ],
  },
]

/** Anchor id used on each accordion item — also the deep-link target. */
const itemAnchorId = (slug: string) => `faq-${slug}`

function indexFromHash(hash: string): number | null {
  const m = hash.match(/^#faq-(.+)$/)
  if (!m) return null
  const idx = FAQS.findIndex((f) => f.slug === m[1])
  return idx >= 0 ? idx : null
}

function AccordionItem({
  faq,
  isOpen,
  onToggle,
  panelId,
  buttonId,
}: {
  faq: Faq
  isOpen: boolean
  onToggle: () => void
  panelId: string
  buttonId: string
}) {
  return (
    <div
      id={itemAnchorId(faq.slug)}
      className={`w-full scroll-mt-16 rounded-2xl border border-[#e4e4e7] md:scroll-mt-20 ${
        isOpen ? 'bg-white' : 'bg-gradient-to-r from-white to-[#f4f4f4]'
      }`}
    >
      <button
        type="button"
        id={buttonId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-6 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
      >
        <span
          className={`flex-1 text-base font-medium leading-6 transition-colors md:text-lg md:leading-7 ${
            isOpen ? 'text-brand-blue' : 'text-[#09090b]'
          }`}
        >
          {faq.q}
        </span>
        <ChevronDownIcon
          className={`size-5 shrink-0 transition-transform duration-300 motion-reduce:transition-none ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {/* Grid 0fr→1fr trick gives us a pure-CSS height animation without
          measuring the panel. Inner div keeps `overflow: hidden` so the
          content clips while the row collapses. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            aria-hidden={!isOpen}
            className={`px-6 pb-6 transition-opacity duration-200 motion-reduce:transition-none ${
              isOpen ? 'opacity-100 delay-100' : 'opacity-0'
            }`}
          >
            <div className="mb-6 h-px w-full bg-[#e4e4e7]" />
            <div className="flex flex-col gap-4 text-base leading-6 text-[#09090b]">
              {(Array.isArray(faq.a) ? faq.a : [faq.a]).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FaqsSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  // Sync openIndex with `#faq-<slug>` so deep-links (e.g. the
  // "About 503A Pharmacies" CTA in AboutSection) auto-open the matching
  // accordion item.
  //
  // Two listeners, because they cover different cases:
  //   - hashchange catches mounts and direct URL navigations.
  //   - click delegation catches re-clicks of a link whose hash already
  //     matches the current URL — those don't fire hashchange, so without
  //     this the accordion would silently stay closed if the user had
  //     manually toggled away from it.
  useEffect(() => {
    const syncFromHash = () => {
      const idx = indexFromHash(window.location.hash)
      if (idx !== null) setOpenIndex(idx)
    }
    const syncFromClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.(
        'a[href*="#faq-"]',
      ) as HTMLAnchorElement | null
      if (!link) return
      const url = new URL(link.href, window.location.href)
      const idx = indexFromHash(url.hash)
      if (idx === null) return
      setOpenIndex(idx)
      // If the URL hash is already the click's target, the browser skips
      // its own scroll-to-anchor behavior. Reproduce it manually so the
      // user still lands on the FAQ item. `scroll-mt-*` on the target is
      // respected by scrollIntoView.
      if (window.location.hash === url.hash) {
        const target = document.getElementById(url.hash.slice(1))
        target?.scrollIntoView({ block: 'start' })
      }
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    document.addEventListener('click', syncFromClick)
    return () => {
      window.removeEventListener('hashchange', syncFromHash)
      document.removeEventListener('click', syncFromClick)
    }
  }, [])

  return (
    <section
      id="faqs"
      aria-labelledby="faqs-heading"
      className="flex scroll-mt-16 flex-col items-start gap-9 md:scroll-mt-20 lg:flex-row lg:items-start lg:gap-[72px]"
    >
      <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[300px]">
        <p className="text-sm font-medium leading-5 text-[#71717a] md:text-base md:leading-6">
          FAQs
        </p>
        <h2
          id="faqs-heading"
          className="font-extralight leading-[1.1] text-[#09090b]"
        >
          <span className="text-4xl md:text-[3.375rem]">In case you were </span>
          <span className="font-serif italic text-[2.625rem] md:text-[4rem]">
            wondering
          </span>
        </h2>
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
        {FAQS.map((faq, idx) => (
          <AccordionItem
            key={idx}
            faq={faq}
            isOpen={openIndex === idx}
            onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
            panelId={`faq-panel-${idx}`}
            buttonId={`faq-button-${idx}`}
          />
        ))}
      </div>
    </section>
  )
}
