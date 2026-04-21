'use client'

import Link from 'next/link'

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

// Heroicon: globe-alt (outline, 24px)
function GlobeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="size-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.038 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.038-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  )
}

function AccessibilityMenuButton() {
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-[#1d2d44] hover:opacity-75 transition-opacity"
      aria-label="Language and Accessibility settings"
    >
      <GlobeIcon />
      <span className="text-[10px] font-medium leading-[1.4] whitespace-nowrap text-left">
        Language &amp;
        <br />
        Accessibility
      </span>
    </button>
  )
}

interface IntakeHeaderProps {
  /** Route to go back to */
  backHref: string
  /** Progress 0–100 */
  progress: number
}

/**
 * Shared header for all intake steps.
 * - Mobile: Back button (left) + Language & Accessibility (right) + progress bar
 * - Desktop: Logo glyph + Back button (left) + Language & Accessibility (right) + progress bar
 */
export default function IntakeHeader({ backHref, progress }: IntakeHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col backdrop-blur-sm bg-white/90">
      {/* Top bar */}
      <div className="flex h-12 md:h-14 items-center justify-between px-4 py-2">
        {/* Left: logo glyph (desktop only) + Back */}
        <div className="flex items-center gap-6">
          {/* Logo glyph — desktop only */}
          <Link href="/" aria-label="PreventiveMD home" className="hidden md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo.svg"
              alt="PreventiveMD"
              width={59}
              height={28}
            />
          </Link>

          {/* Back button */}
          <Link
            href={backHref}
            className="flex items-center gap-2 px-2 py-1 rounded-md text-[#1d2d44] hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
            aria-label="Go back"
          >
            <ChevronLeftIcon />
            <span className="text-xs font-medium tracking-[1.5px] uppercase leading-4">
              Back
            </span>
          </Link>
        </div>

        {/* Right: Language & Accessibility */}
        <AccessibilityMenuButton />
      </div>

      {/* Progress bar */}
      <div className="relative h-1 w-full" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Intake form progress">
        {/* Track */}
        <div className="absolute inset-0 bg-[#0778ba]/20" />
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full bg-[#0778ba] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  )
}
