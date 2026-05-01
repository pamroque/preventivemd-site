'use client'

import Link from 'next/link'
import AccessibilityMenu from '@/components/a11y/AccessibilityMenu'

// Heroicons: chevron-left (micro, 16px solid)
function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="size-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

interface BackHeaderProps {
  /** Route to go back to */
  backHref: string
  /** Progress 0–100. When provided, renders a progress bar; otherwise renders a bottom border. */
  progress?: number
}

/**
 * Shared header for screens that need a "← BACK" affordance plus the
 * Language & Accessibility button. Used by intake/questionnaire steps
 * (with progress) and minimal portal screens like sign-in verify
 * (without progress).
 *
 * Layout: logo glyph + Back (left) + Language & Accessibility (right).
 */
export default function BackHeader({ backHref, progress }: BackHeaderProps) {
  const hasProgress = typeof progress === 'number'

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex flex-col backdrop-blur-sm bg-white/90 ${
        hasProgress ? '' : 'border-b border-[#e3e3e3]'
      }`}
    >
      {/* Top bar */}
      <div className="flex h-12 md:h-14 items-center justify-between px-4 py-2">
        {/* Left: logo glyph + Back */}
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/" aria-label="PreventiveMD home" className="block shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo.svg"
              alt="PreventiveMD"
              width={38}
              height={18}
              className="h-[18px] w-auto"
            />
          </Link>

          <Link
            href={backHref}
            className="flex items-center gap-2 px-2 py-1 rounded-md text-[#1d2d44] hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
            aria-label="Go back"
          >
            <ChevronLeftIcon />
            <span className="text-xs font-medium tracking-[1.5px] uppercase leading-4">
              Back
            </span>
          </Link>
        </div>

        {/* Right: Language & Accessibility */}
        <AccessibilityMenu align="right" />
      </div>

      {/* Progress bar (only when progress provided) */}
      {hasProgress && (
        <div
          className="relative h-1 w-full"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Intake form progress"
        >
          <div className="absolute inset-0 bg-[#3A5190]/20" />
          <div
            className="absolute left-0 top-0 h-full bg-[#3A5190] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </header>
  )
}
