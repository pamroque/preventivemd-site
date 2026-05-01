'use client'

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

/**
 * Six-cell one-time-passcode input. Standard auto-advance UX:
 *  - Typing a digit fills the cell and moves focus to the next.
 *  - Backspace on an empty cell jumps focus to the previous cell.
 *  - Pasting a 6-digit code fills all cells and focuses the last.
 *
 * Value is held by the parent; this component only renders cells and emits
 * onChange with the joined string. Aria-described error text lives on the
 * parent's group label.
 */

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  /** Existing id for label association on the group label */
  ariaLabelledBy?: string
  /** Existing id for error association */
  ariaDescribedBy?: string
  invalid?: boolean
  disabled?: boolean
}

const CELLS = 6

export default function OtpInput({
  value,
  onChange,
  ariaLabelledBy,
  ariaDescribedBy,
  invalid,
  disabled,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const digits = padTo(value.replace(/\D/g, '').slice(0, CELLS), CELLS)

  function setDigit(index: number, digit: string) {
    const next = digits.split('')
    next[index] = digit
    onChange(next.join('').replace(/ /g, '').slice(0, CELLS))
  }

  function focusCell(index: number) {
    refs.current[index]?.focus()
    refs.current[index]?.select()
  }

  function handleInput(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    setDigit(index, digit || ' ')
    if (digit && index < CELLS - 1) focusCell(index + 1)
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const current = digits[index]
      if (!current.trim() && index > 0) {
        e.preventDefault()
        setDigit(index - 1, ' ')
        focusCell(index - 1)
      } else if (current.trim()) {
        e.preventDefault()
        setDigit(index, ' ')
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      focusCell(index - 1)
    } else if (e.key === 'ArrowRight' && index < CELLS - 1) {
      e.preventDefault()
      focusCell(index + 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CELLS)
    if (!pasted) return
    e.preventDefault()
    onChange(pasted)
    focusCell(Math.min(pasted.length, CELLS - 1))
  }

  return (
    <div
      role="group"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className="flex gap-2 items-stretch w-full"
    >
      {Array.from({ length: CELLS }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digits[i].trim()}
          onChange={e => handleInput(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${CELLS}`}
          aria-invalid={invalid}
          className={`
            flex-1 min-w-0 aspect-square text-center text-base text-[rgba(0,0,0,0.87)]
            bg-white border rounded-lg shadow-sm
            focus:outline-none focus:border-[#3A5190] transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed
            ${invalid ? 'border-red-600 focus:border-red-600' : 'border-[#e4e4e7]'}
          `}
        />
      ))}
    </div>
  )
}

function padTo(s: string, len: number): string {
  return (s + ' '.repeat(len)).slice(0, len)
}
