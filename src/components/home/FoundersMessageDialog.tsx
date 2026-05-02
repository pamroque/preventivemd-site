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

const TRIGGER_LABEL = 'Message from our founders'

/**
 * Trigger button + modal that surfaces the founders' letter copy. Uses the
 * native `<dialog>` element so the platform handles focus trap, Escape, and
 * the backdrop. The trigger styling matches the other tile CTAs in
 * AboutSection so it can drop in as `ctaSlot` without visual drift.
 */
export default function FoundersMessageDialog() {
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
        // Click-outside to close: the dialog itself is the only element that
        // receives the click when the backdrop is hit (children stop the
        // bubble naturally because the inner wrapper covers the dialog).
        onClick={(e) => {
          if (e.target === dialogRef.current) close()
        }}
        aria-labelledby="founders-message-heading"
        className="m-auto w-[calc(100vw-32px)] max-w-[640px] rounded-[24px] bg-white p-0 backdrop:bg-black/70 md:rounded-[36px]"
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

          <div className="flex flex-col text-[#09090b] pr-8 md:pr-10">
            <h2
              id="founders-message-heading"
              className="font-serif italic text-[1.75rem] leading-[1.2] md:text-[2rem]"
            >
              To our patients and future patients,
            </h2>

            <div className="mt-7 flex flex-col gap-6 text-base leading-6">
              <p>
                Most healthcare treats illness. We believe care should help
                people thrive, not just react to disease. That&rsquo;s what drew
                us to peptides.
              </p>
              <p>
                But this space is full of shortcuts and bad actors — unregulated
                sellers, suppliers, and practices. We&rsquo;ve navigated it
                ourselves, and we know patients deserve better.
              </p>
              <p>
                If there&rsquo;s anything we can do to improve your experience,
                please let us know at{' '}
                <a
                  href="tel:+19876543210"
                  className="underline decoration-solid underline-offset-2"
                >
                  +1 (987) 654-3210
                </a>{' '}
                or{' '}
                <a
                  href="mailto:hello@preventivemd.com"
                  className="underline decoration-solid underline-offset-2"
                >
                  hello@preventivemd.com
                </a>
                .
              </p>
            </div>

            <p className="mt-7 text-base font-bold leading-6">
              Patients first, founders second,
            </p>
            <p className="font-serif italic text-xl leading-7">
              <span>{'— '}</span>
              <span>Andrew</span>
              <span>{', '}</span>
              <span>Patrick</span>
              <span>{', & '}</span>
              <span>Sherry</span>
            </p>
          </div>
        </div>
      </dialog>
    </>
  )
}
