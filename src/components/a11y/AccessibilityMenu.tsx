'use client'

import { useEffect, useId, useRef, useState } from 'react'
import {
  type Language,
  useAccessibilitySettings,
} from './AccessibilityContext'

/** heroicons-outline/globe-alt */
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1}
      stroke="currentColor"
      className={className ?? 'size-6'}
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

function ToggleSwitch({
  checked,
  onChange,
  labelledBy,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  labelledBy: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-8 shrink-0 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1 ${
        checked
          ? 'bg-[#3A5190] border-[#0778ba]'
          : 'bg-[#a1a1aa] border-[#a1a1aa]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1/2 size-4 -translate-y-1/2 rounded-[10px] border bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-[left] ${
          checked
            ? 'left-[13px] border-[#0778ba]'
            : 'left-px border-[#e4e4e7]'
        }`}
      />
    </button>
  )
}

function RadioOption({
  name,
  value,
  checked,
  onChange,
  label,
  disabled = false,
  hint,
}: {
  name: string
  value: Language
  checked: boolean
  onChange: (v: Language) => void
  label: string
  disabled?: boolean
  hint?: string
}) {
  const inputId = `${name}-${value}`
  return (
    <label
      htmlFor={inputId}
      aria-disabled={disabled || undefined}
      className={`flex w-full items-start gap-3 px-4 py-2 ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      }`}
    >
      <span className="flex h-5 w-4 shrink-0 items-center justify-center">
        <input
          id={inputId}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={() => onChange(value)}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className={`relative block size-4 rounded-lg border ${
            checked
              ? 'border-[#3A5190] bg-[#3A5190] shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.15)]'
              : 'border-[#e4e4e7] bg-white'
          }`}
        >
          {checked && (
            <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          )}
        </span>
      </span>
      <span className="flex-1 min-w-0 text-sm font-medium leading-5 text-[#09090b]">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-[#71717a]">{hint}</span>
        )}
      </span>
    </label>
  )
}

interface Props {
  /** Side of the trigger the popover opens toward. */
  align?: 'left' | 'right'
  /** Override for the wrapper's classes — useful when the trigger needs to be
   *  positioned (e.g. corner-pinned in HomeHero). */
  wrapperClassName?: string
  /** Override for the trigger button's classes. Defaults to the small icon +
   *  stacked label used in nav/back-header. */
  triggerClassName?: string
  /** When true, hides the "Language & Accessibility" label below md. Used by
   *  the HomeHero corner pill where only the globe fits on mobile. */
  compact?: boolean
}

/**
 * Language & Accessibility menu. Trigger button + dropdown with two toggles
 * (Animations, Enhanced Readability) and a Language radio group. Settings are
 * persisted via AccessibilityProvider.
 */
export default function AccessibilityMenu({
  align = 'right',
  wrapperClassName,
  triggerClassName,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const {
    animations,
    enhancedReadability,
    language,
    setAnimations,
    setEnhancedReadability,
    setLanguage,
  } = useAccessibilitySettings()

  // Stable ids so labels can associate with controls.
  const animLabelId = useId()
  const readLabelId = useId()
  const radioName = useId()

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const defaultTrigger =
    'flex items-center gap-1 rounded-md text-[#1d2d44] transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]'

  return (
    <div ref={containerRef} className={wrapperClassName ?? 'relative'}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Language and Accessibility settings"
        className={triggerClassName ?? defaultTrigger}
      >
        <GlobeIcon className="size-6 shrink-0" />
        <span
          className={`text-left text-[0.625rem] font-medium leading-[1.4] whitespace-nowrap ${
            compact ? 'hidden md:block' : ''
          }`}
        >
          Language &amp;
          <br />
          Accessibility
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Language and Accessibility settings"
          className={`absolute top-[calc(100%+8px)] z-50 flex w-60 flex-col gap-2.5 rounded-xl border border-[#e4e4e7] bg-white/90 p-1 shadow-[0px_4px_6px_rgba(0,0,0,0.15)] backdrop-blur-[2px] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Animations toggle */}
          <div className="flex w-full items-center gap-2 px-4 py-2">
            <p
              id={animLabelId}
              className="min-w-0 flex-1 text-sm font-medium leading-5 text-[#09090b]"
            >
              Animations
            </p>
            <ToggleSwitch
              checked={animations}
              onChange={setAnimations}
              labelledBy={animLabelId}
            />
          </div>

          {/* Enhanced Readability toggle */}
          <div className="flex w-full items-center gap-2 px-4 py-2">
            <p
              id={readLabelId}
              className="min-w-0 flex-1 text-sm font-medium leading-5 text-[#09090b]"
            >
              Enhanced Readability
            </p>
            <ToggleSwitch
              checked={enhancedReadability}
              onChange={setEnhancedReadability}
              labelledBy={readLabelId}
            />
          </div>

          {/* Language section */}
          <div className="flex w-full flex-col items-start gap-2.5">
            <div className="flex w-full flex-col px-4 py-2">
              <div className="h-px w-full bg-[#e4e4e7]" />
            </div>
            <div className="flex w-full px-4 py-1">
              <p className="text-xs uppercase tracking-[1.5px] leading-4 text-[#71717a]">
                Language
              </p>
            </div>
            <RadioOption
              name={radioName}
              value="en"
              checked={language === 'en'}
              onChange={setLanguage}
              label="English"
            />
            <RadioOption
              name={radioName}
              value="es"
              checked={language === 'es'}
              onChange={setLanguage}
              label="Español"
              hint="(coming soon)"
              disabled
            />
          </div>
        </div>
      )}
    </div>
  )
}
