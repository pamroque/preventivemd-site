'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'
const QUESTION_TEXT = 'How and when would you like to have your live consultation?'
const PROGRESS = 90
const NEXT_ROUTE = '/get-started/questionnaire/desired-treatments'

const SYNC_REQUIRED_STATES = new Set(['KY', 'LA', 'MS', 'NM', 'RI', 'WV'])

// ─── Time slots ───────────────────────────────────────────────────────────────

const TIME_CATEGORIES: { label: string; slots: string[] }[] = [
  { label: 'Morning',   slots: ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'] },
  { label: 'Afternoon', slots: ['1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM'] },
  { label: 'Evening',   slots: ['5:00 PM', '5:30 PM', '6:00 PM'] },
]

const DEFAULT_TIME = '9:00 AM'

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_ABBRS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function calendarWeeks(year: number, month: number): (number | null)[][] {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function getTimezoneDisplay(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const date = new Date()
  try {
    const short = new Intl.DateTimeFormat('en-US', { timeZoneName: 'shortGeneric', timeZone: tz })
      .formatToParts(date).find(p => p.type === 'timeZoneName')?.value ?? ''
    const long = new Intl.DateTimeFormat('en-US', { timeZoneName: 'longGeneric', timeZone: tz })
      .formatToParts(date).find(p => p.type === 'timeZoneName')?.value ?? tz
    return `${long} (${short})`
  } catch {
    return tz.replace(/_/g, ' ')
  }
}

function formatDateLabel(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatNextDayLabel(d: Date): string {
  const next = addDays(d, 1)
  return `${MONTH_NAMES[next.getMonth()].slice(0, 3)} ${next.getDate()}`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function CalChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      className="size-6" aria-hidden="true">
      <path fillRule="evenodd"
        d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5Z"
        clipRule="evenodd" />
    </svg>
  )
}

function CalChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      className="size-6" aria-hidden="true">
      <path fillRule="evenodd"
        d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
        clipRule="evenodd" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      className="size-5 text-[rgba(0,0,0,0.54)]" aria-hidden="true">
      <path fillRule="evenodd"
        d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
        clipRule="evenodd" />
    </svg>
  )
}

function ChevronUpDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 text-[rgba(0,0,0,0.54)]" aria-hidden="true">
      <path fillRule="evenodd"
        d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3Zm-3.76 9.2a.75.75 0 0 1 1.06.04l2.7 2.908 2.7-2.908a.75.75 0 1 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5a.75.75 0 0 1 .04-1.06Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookConsultationPage() {
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<PriorStep | null>(null)

  const [requiresSync] = useState(() => {
    const s0 = getStepValues(0)
    return typeof s0.state === 'string' && SYNC_REQUIRED_STATES.has(s0.state)
  })

  // Form state
  const [language, setLanguage] = useState('English')
  const [format, setFormat] = useState(() => {
    const s0 = getStepValues(0)
    if (typeof s0.state === 'string' && SYNC_REQUIRED_STATES.has(s0.state)) return 'Video'
    const saved = getStepValues(12)
    return typeof saved.format === 'string' ? saved.format : ''
  })
  const [formatError, setFormatError] = useState('')

  // Calendar state — today captured once at mount
  const today = useMemo(() => startOfDay(new Date()), [])
  const [viewMonth, setViewMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [selectedDate, setSelectedDate] = useState(addDays(today, 1))
  const [selectedTime, setSelectedTime] = useState(DEFAULT_TIME)

  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(today.getFullYear())
  const [timezone, setTimezone] = useState('Eastern Time (ET)')

  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    setTimezone(getTimezoneDisplay())
  }, [])

  useEffect(() => {
    const prior = getPriorSteps(12) // includes step 11 (visit-type selection)
    const last = prior[prior.length - 1]
    if (last) {
      setCurrentStep({ ...last, editHref: '/get-started/questionnaire/visit-type' })
    }

    // Restore saved values on back navigation
    const saved = getStepValues(12)
    if (typeof saved.language === 'string' && saved.language) setLanguage(saved.language)
    if (!requiresSync && typeof saved.format === 'string' && saved.format) setFormat(saved.format)
    if (typeof saved.time === 'string' && saved.time) setSelectedTime(saved.time)
    if (typeof saved.date === 'string' && saved.date) {
      const d = startOfDay(new Date(saved.date))
      if (!isNaN(d.getTime()) && d > today) {
        setSelectedDate(d)
        setViewMonth({ year: d.getFullYear(), month: d.getMonth() })
      }
    }
  }, [today, requiresSync])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  // Calendar
  const weeks = useMemo(
    () => calendarWeeks(viewMonth.year, viewMonth.month),
    [viewMonth],
  )
  const canGoPrev =
    viewMonth.year > today.getFullYear() ||
    (viewMonth.year === today.getFullYear() && viewMonth.month > today.getMonth())

  function handlePrevMonth() {
    if (!canGoPrev) return
    setViewMonth(p =>
      p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 },
    )
  }

  function handleNextMonth() {
    setViewMonth(p =>
      p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 },
    )
  }

  function handleDayClick(day: number) {
    const d = startOfDay(new Date(viewMonth.year, viewMonth.month, day))
    if (d <= today) return
    setSelectedDate(d)
    setSelectedTime(DEFAULT_TIME)
  }

  function handleNextDay() {
    const next = addDays(selectedDate, 1)
    setSelectedDate(next)
    setSelectedTime(DEFAULT_TIME)
    setViewMonth({ year: next.getFullYear(), month: next.getMonth() })
  }

  function getDayVariant(day: number): 'past' | 'today' | 'selected' | 'future' {
    const d = startOfDay(new Date(viewMonth.year, viewMonth.month, day))
    if (d < today) return 'past'
    if (isSameDay(d, today)) return 'today'
    if (isSameDay(d, selectedDate)) return 'selected'
    return 'future'
  }

  function handleSave() {
    if (isNavigating) return
    if (!format) {
      setFormatError('Please select a format.')
      return
    }
    setFormatError('')
    setIsNavigating(true)
    saveStep(
      12,
      {
        question: QUESTION_TEXT,
        bubbles: [`${language} · ${format} · ${formatDateLabel(selectedDate)} · ${selectedTime}`],
      },
      { language, format, date: selectedDate.toISOString(), time: selectedTime },
    )
    router.push(NEXT_ROUTE)
  }

  return (
    <>
      <IntakeHeader backHref="/get-started/questionnaire/visit-type" progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className="overflow-y-auto bg-white focus:outline-none"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: done ? '88px' : '2rem',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 py-4 md:py-6">

          {/* Prior step Q&A bubble */}
          <ChatHistory
            historicSteps={[]}
            currentStep={currentStep}
            animateCurrentStep={animateBubbles}
          />

          {/* Eve's question */}
          <div className="flex items-start gap-3 w-full">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <p
              className="flex-1 min-w-0 text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)] min-h-[1.5em]"
              aria-live="polite"
              aria-label={QUESTION_TEXT}
            >
              {typingStarted && (
                <>
                  {words.slice(0, visibleWords).map((word, i) => (
                    <span key={i}>{word}{i < visibleWords - 1 ? ' ' : ''}</span>
                  ))}
                  {visibleWords < words.length && (
                    <span
                      className="inline-block w-[2px] h-[1em] bg-current align-middle ml-[1px] animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </p>
          </div>

          {/* Booking form */}
          {done && (
            <div className="flex flex-col gap-4 animate-[fadeIn_0.4s_ease_forwards]">

              {/* ── Language + Format dropdowns ── */}
              <div className="grid grid-cols-2 gap-3">

                {/* Language */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="language" className="text-[14px] font-medium leading-5 text-[#09090b]">
                    Language{' '}
                    <span className="text-[#b91c1c]" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="language"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full h-[42px] pl-3 pr-9 border border-[#e4e4e7] rounded-lg bg-white text-base text-[#09090b] shadow-sm appearance-none cursor-pointer focus:outline-none focus:border-[#0778ba] transition-colors"
                    >
                      <option>English</option>
                      <option>Español</option>
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                      <ChevronUpDownIcon />
                    </div>
                  </div>
                </div>

                {/* Format */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="format" className="text-[14px] font-medium leading-5 text-[#09090b]">
                    Format{' '}
                    <span className="text-[#b91c1c]" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <div className={`relative ${requiresSync ? 'opacity-50' : ''}`}>
                    <select
                      id="format"
                      value={format}
                      onChange={e => { setFormat(e.target.value); if (formatError) setFormatError('') }}
                      disabled={requiresSync}
                      aria-describedby={formatError ? 'format-error' : undefined}
                      aria-invalid={!!formatError}
                      aria-required="true"
                      className={`w-full h-[42px] pl-3 pr-9 border rounded-lg bg-white text-base shadow-sm appearance-none focus:outline-none focus:border-[#0778ba] transition-colors ${
                        requiresSync ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${!format ? 'text-[#a1a1aa]' : 'text-[#09090b]'} ${
                        formatError ? 'border-red-600' : 'border-[#e4e4e7]'
                      }`}
                    >
                      {!requiresSync && <option value="" disabled hidden>Select a format</option>}
                      <option value="Video">Video</option>
                      {!requiresSync && <option value="Phone">Phone</option>}
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                      <ChevronUpDownIcon />
                    </div>
                  </div>
                  {formatError && (
                    <p id="format-error" className="text-xs text-red-600 leading-4 mt-0.5">
                      {formatError}
                    </p>
                  )}
                </div>

              </div>

              {/* ── Date picker ── */}
              <div className="flex flex-col items-center w-full">

                {/* Month row */}
                <div className="flex items-center w-full pl-6 pr-3 pt-4 pb-2">
                  <button
                    type="button"
                    onClick={() => { setShowMonthPicker(p => !p); setPickerYear(viewMonth.year) }}
                    className="flex items-center gap-1.5 flex-1 min-w-0 hover:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba] rounded"
                    aria-expanded={showMonthPicker}
                    aria-label="Select month and year"
                  >
                    <span className="text-base font-medium leading-6 tracking-[0.15px] text-[rgba(0,0,0,0.87)] whitespace-nowrap">
                      {showMonthPicker ? pickerYear : MONTH_NAMES[viewMonth.month]}
                    </span>
                    {!showMonthPicker && (
                      <span className="text-base font-medium leading-6 tracking-[0.15px] text-[rgba(0,0,0,0.87)]">
                        {viewMonth.year}
                      </span>
                    )}
                    <div className={`transition-transform duration-200 ${showMonthPicker ? 'rotate-180' : ''}`}>
                      <ChevronDownIcon />
                    </div>
                  </button>
                  <div className="flex gap-6 shrink-0">
                    {showMonthPicker ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPickerYear(y => y - 1)}
                          disabled={pickerYear <= today.getFullYear()}
                          className="p-[5px] rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
                          aria-label="Previous year"
                        >
                          <CalChevronLeftIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerYear(y => y + 1)}
                          className="p-[5px] rounded-full hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
                          aria-label="Next year"
                        >
                          <CalChevronRightIcon />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          disabled={!canGoPrev}
                          className="p-[5px] rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
                          aria-label="Previous month"
                        >
                          <CalChevronLeftIcon />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-[5px] rounded-full hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
                          aria-label="Next month"
                        >
                          <CalChevronRightIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {showMonthPicker ? (
                  /* ── Month picker grid ── */
                  <div className="grid grid-cols-3 gap-2 w-full px-4 py-3" role="grid" aria-label={`${pickerYear}`}>
                    {MONTH_ABBRS.map((abbr, mi) => {
                      const isPast = pickerYear < today.getFullYear() ||
                        (pickerYear === today.getFullYear() && mi < today.getMonth())
                      const isActive = pickerYear === viewMonth.year && mi === viewMonth.month
                      return (
                        <button
                          key={abbr}
                          type="button"
                          role="gridcell"
                          disabled={isPast}
                          onClick={() => {
                            setViewMonth({ year: pickerYear, month: mi })
                            setShowMonthPicker(false)
                          }}
                          aria-pressed={isActive}
                          className={`h-9 rounded-full text-[14px] leading-[1.43] tracking-[0.17px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba] focus-visible:ring-offset-1 ${
                            isActive
                              ? 'bg-[#1d2d44] text-white'
                              : isPast
                              ? 'text-[rgba(0,0,0,0.38)] cursor-default'
                              : 'text-[rgba(0,0,0,0.87)] hover:bg-gray-100'
                          }`}
                        >
                          {abbr}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <>
                    {/* Day initials */}
                    <div className="flex gap-0.5 w-full justify-center" aria-hidden="true">
                      {DAY_INITIALS.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center size-9 text-[14px] leading-[1.43] tracking-[0.17px] text-[rgba(0,0,0,0.6)]"
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Date grid */}
                    <div
                      className="flex flex-col gap-0.5 pt-3 w-full"
                      role="grid"
                      aria-label={`${MONTH_NAMES[viewMonth.month]} ${viewMonth.year}`}
                    >
                      {weeks.map((week, wi) => (
                        <div key={wi} className="flex gap-0.5 justify-center" role="row">
                          {week.map((day, di) => {
                            if (day === null) {
                              return (
                                <div key={di} className="size-9" role="gridcell" aria-hidden="true" />
                              )
                            }
                            const variant = getDayVariant(day)
                            return (
                              <div key={di} role="gridcell">
                                <button
                                  type="button"
                                  onClick={() => handleDayClick(day)}
                                  disabled={variant === 'past'}
                                  aria-pressed={variant === 'selected'}
                                  aria-label={`${MONTH_NAMES[viewMonth.month]} ${day}${variant === 'today' ? ', today' : ''}${variant === 'selected' ? ', selected' : ''}`}
                                  className={`flex items-center justify-center size-9 rounded-full text-[14px] leading-[1.43] tracking-[0.17px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba] focus-visible:ring-offset-1 ${
                                    variant === 'selected'
                                      ? 'bg-[#1d2d44] text-white'
                                      : variant === 'today'
                                      ? 'border border-[rgba(0,0,0,0.54)] text-[rgba(0,0,0,0.87)] hover:bg-gray-100 cursor-default'
                                      : variant === 'past'
                                      ? 'text-[rgba(0,0,0,0.38)] cursor-default'
                                      : 'text-[rgba(0,0,0,0.87)] hover:bg-gray-100'
                                  }`}
                                >
                                  {day}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </>
                )}

              </div>

              {/* ── Selected date heading + timezone ── */}
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-bold leading-7 tracking-[0.15px] text-[rgba(0,0,0,0.87)]">
                  {formatDateLabel(selectedDate)}
                </p>
                <p className="text-[14px] font-medium leading-[1.57] tracking-[0.1px] text-[rgba(0,0,0,0.6)]">
                  All 20-minute slots are based on your time zone: {timezone}
                </p>
              </div>

              {/* ── Time slot categories ── */}
              {TIME_CATEGORIES.map(({ label, slots }) => (
                <div key={label} className="flex flex-col gap-2">
                  <p className="text-[12px] leading-[2.66] tracking-[1px] uppercase text-[rgba(0,0,0,0.87)]">
                    {label}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map(time => {
                      const isSelected = time === selectedTime
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          aria-pressed={isSelected}
                          className={`relative h-[42px] flex items-center justify-center px-2 rounded-lg text-base font-medium leading-6 whitespace-nowrap overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba] focus-visible:ring-offset-1 ${
                            isSelected
                              ? 'border border-[#1d2d44] text-white shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.15)]'
                              : 'bg-white border border-[#e4e4e7] text-[#09090b] shadow-sm hover:border-[#0778ba]/40'
                          }`}
                          style={isSelected
                            ? { background: 'linear-gradient(to right, #1d2d44, #233d5a)' }
                            : undefined
                          }
                        >
                          {time}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* ── Next day link ── */}
              <button
                type="button"
                onClick={handleNextDay}
                className="flex items-center gap-3 px-4 py-2 text-base font-medium text-[#0778ba] hover:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba] rounded-lg self-start"
              >
                Next: {formatNextDayLabel(selectedDate)}
                <ChevronRightIcon />
              </button>

            </div>
          )}

        </div>
      </main>

      {/* ── Fixed bottom CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-2 pb-2 md:pb-12 pt-4 transition-all duration-500"
        style={{
          opacity: done ? 1 : 0,
          pointerEvents: done ? 'auto' : 'none',
          background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))',
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={isNavigating}
          className="
            relative flex items-center justify-center gap-3
            w-full md:w-[480px] h-[42px] px-4 overflow-hidden
            rounded-br-[36px] rounded-tl-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
          "
          style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
        >
          {isNavigating ? 'Saving…' : 'Save and continue'}
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
