'use client'

import { useEffect, useRef, useState } from 'react'

/** Heroicons-mini/x-mark — close icon */
function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? 'size-5'}
      aria-hidden="true"
    >
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

const TRIGGER_LABEL = 'Our medical advisors'

type Advisor = {
  name: string
  credential: string
  /** Optional headshot path (e.g. /assets/home/advisor-doe.png). */
  photo?: string
  /** Personal/practice website. */
  website?: string
}

// Placeholder roster — swap in real names, credentials, photos, and websites
// when ready.
const ADVISORS: Advisor[] = [
  { name: 'Dr. Advisor One', credential: 'Board-certified Internal Medicine, [Institution]', website: '#' },
  { name: 'Dr. Advisor Two', credential: 'Endocrinology & Metabolism, [Institution]', website: '#' },
  { name: 'Dr. Advisor Three', credential: 'Preventive & Lifestyle Medicine, [Institution]', website: '#' },
]

function initialsOf(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function MedicalAdvisorsDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.96px] leading-4 text-[#09090b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] md:leading-5"
      >
        {TRIGGER_LABEL}
      </button>

      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(e) => {
          if (e.target === dialogRef.current) close()
        }}
        aria-labelledby="medical-advisors-heading"
        className="m-auto w-[calc(100vw-32px)] max-w-[720px] rounded-[24px] bg-white p-0 backdrop:bg-black/70 md:rounded-[36px]"
      >
        <div className="relative flex flex-col gap-6 p-6 md:p-8">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-[#71717a] transition-colors hover:bg-[#f4f4f5] hover:text-[#09090b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] md:right-6 md:top-6"
          >
            <XMarkIcon className="size-5" />
          </button>

          <div className="flex flex-col pr-8 text-[#09090b] md:pr-10">
            <h2
              id="medical-advisors-heading"
              className="font-serif italic text-[1.75rem] leading-[1.2] md:text-[2rem]"
            >
              Our medical advisors
            </h2>
          </div>

          <ul className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            {ADVISORS.map((a) => (
              <li
                key={a.name}
                className="flex flex-col items-center gap-3 rounded-[20px] border border-[#e4e4e7] bg-white p-5 text-center md:items-start md:text-left"
              >
                <div
                  aria-hidden="true"
                  className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-[#f4f4f5] text-sm font-medium uppercase tracking-[0.96px] text-[#71717a]"
                >
                  {a.photo ? null : initialsOf(a.name)}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-medium leading-6 text-[#09090b]">
                    {a.name}
                  </p>
                  <p className="text-[0.8125rem] leading-5 text-[#52525b]">
                    {a.credential}
                  </p>
                </div>
                {a.website && (
                  <a
                    href={a.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.96px] leading-4 text-[#09090b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50 md:leading-5"
                  >
                    Visit website
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  )
}
