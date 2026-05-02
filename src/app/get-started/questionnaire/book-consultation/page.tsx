'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackHeader from '@/components/ui/BackHeader'
import DisqualificationGate from '@/components/ui/DisqualificationGate'
import ChatHistory, { type PriorStep } from '@/components/ui/ChatHistory'
import { getPriorSteps, getStepValues, saveStep } from '@/lib/intake-session-store'
import { useEveTyping } from '@/lib/useEveTyping'
import { SYNC_REQUIRED_STATES_SET } from '@/lib/intake-flow'
import { getSessionToken } from '@/lib/supabase/intake-session'

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'
const QUESTION_TEXT = 'How and when would you like to have your live consultation?'
const PROGRESS = 90
const NEXT_ROUTE = '/get-started/questionnaire/checkout'

// SYNC_REQUIRED_STATES_SET is the single source of truth, imported from
// @/lib/intake-flow. Don't redeclare here — Mississippi was missing locally
// before consolidation, which silently routed MS patients through async.

// 14-day booking window. Matches the default in /api/availability so the
// patient can't pick beyond what the calendar actually contains.
const LOOKAHEAD_DAYS = 14

// ─── Slot types ───────────────────────────────────────────────────────────────

interface Slot {
  slotDatetime:    string  // ISO-8601 UTC
  durationMinutes: number
  contactType:     'video' | 'phone'
  providerId:      string
  providerName:    string
  healthieUserId:  string
}

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

/** Local-time YYYY-MM-DD key for grouping slots by date. */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Render a slot's datetime as "9:00 AM" in the patient's local TZ. */
function formatSlotTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

/** Short generic TZ abbreviation for the patient's browser ("PT", "CT", "ET",
 *  "MT", "AKT", "HST"). Used to qualify a saved consultation time so the
 *  patient sees the zone clearly later in the flow. */
function shortTzAbbr(iso: string): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return new Intl.DateTimeFormat('en-US', { timeZoneName: 'shortGeneric', timeZone: tz })
      .formatToParts(new Date(iso))
      .find((p) => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

/** Categorize slots by morning (<12), afternoon (12–17), evening (≥17). */
function categorizeSlots(daySlots: Slot[]): {
  morning:   Slot[]
  afternoon: Slot[]
  evening:   Slot[]
} {
  const morning:   Slot[] = []
  const afternoon: Slot[] = []
  const evening:   Slot[] = []
  for (const s of daySlots) {
    const h = new Date(s.slotDatetime).getHours()
    if (h < 12)      morning.push(s)
    else if (h < 17) afternoon.push(s)
    else             evening.push(s)
  }
  return { morning, afternoon, evening }
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
    return typeof s0.state === 'string' && SYNC_REQUIRED_STATES_SET.has(s0.state)
  })

  // Patient state lookup (drives /api/availability filtering).
  const patientState = useMemo(() => {
    const s = getStepValues(0).state
    return typeof s === 'string' && /^[A-Z]{2}$/.test(s) ? s : ''
  }, [])

  // Form state
  const [language, setLanguage] = useState('English')
  // Default to Video (most common modality + sync-required states must be
  // video). The Format dropdown remains visible/editable for non-sync
  // states so a phone-preferring patient can still switch.
  const [format, setFormat] = useState(() => {
    const s0 = getStepValues(0)
    if (typeof s0.state === 'string' && SYNC_REQUIRED_STATES_SET.has(s0.state)) return 'Video'
    const saved = getStepValues(13)
    if (typeof saved.format === 'string' && saved.format) return saved.format
    return 'Video'
  })
  const [formatError, setFormatError] = useState('')

  // Calendar state — today captured once at mount
  const today = useMemo(() => startOfDay(new Date()), [])
  const [viewMonth, setViewMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(today.getFullYear())
  const [timezone, setTimezone] = useState('Eastern Time (ET)')

  const [isNavigating, setIsNavigating] = useState(false)

  // Real availability — fetched from /api/availability, filtered by state +
  // contactType + active holds. Refetches whenever format changes.
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [holdError, setHoldError] = useState<string | null>(null)
  // Bumping this number triggers a refetch (used after a 409 conflict).
  const [refetchCounter, setRefetchCounter] = useState(0)

  useEffect(() => {
    setTimezone(getTimezoneDisplay())
  }, [])

  useEffect(() => {
    const prior = getPriorSteps(13) // includes step 11 (visit-type) + step 12 (desired-treatments)
    const last = prior[prior.length - 1]
    if (last) {
      setCurrentStep({ ...last, editHref: '/get-started/questionnaire/desired-treatments' })
    }
    const saved = getStepValues(13)
    if (typeof saved.language === 'string' && saved.language) setLanguage(saved.language)
    if (!requiresSync && typeof saved.format === 'string' && saved.format) setFormat(saved.format)
  }, [requiresSync])

  // ── Fetch availability ──────────────────────────────────────────────────
  // Skip until we know format (the contactType param) and have a state.
  useEffect(() => {
    if (!format || !patientState) return
    let cancelled = false
    const ac = new AbortController()

    setSlotsLoading(true)
    setLoadError(null)

    const contactType = format.toLowerCase()       // 'video' | 'phone'
    const fromStr = today.toISOString().slice(0, 10)
    const toStr   = addDays(today, LOOKAHEAD_DAYS).toISOString().slice(0, 10)
    const qs = new URLSearchParams({
      state:       patientState,
      contactType,
      from:        fromStr,
      to:          toStr,
    })
    if (requiresSync) qs.set('videoOnly', '1')

    fetch(`/api/availability?${qs.toString()}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (!data?.ok) {
          setLoadError(data?.error ?? 'Could not load availability')
          setSlots([])
          return
        }
        setSlots((data.slots ?? []) as Slot[])
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return
        // Fall back silently to empty slots — the "No available slots"
        // message below covers this state without surfacing raw fetch/parse
        // errors (e.g. "Unexpected end of JSON input") to the patient.
        setSlots([])
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false)
      })

    return () => { cancelled = true; ac.abort() }
  }, [format, patientState, requiresSync, today, refetchCounter])

  const priorBubbleCount = currentStep?.bubbles.length ?? 0
  const { animateBubbles, visibleWords, typingStarted, done, words } =
    useEveTyping(QUESTION_TEXT, priorBubbleCount)

  // ── Derived: slots grouped by local date ─────────────────────────────
  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const s of slots) {
      const k = dateKey(new Date(s.slotDatetime))
      const arr = map.get(k) ?? []
      arr.push(s)
      map.set(k, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.slotDatetime.localeCompare(b.slotDatetime))
    }
    return map
  }, [slots])

  const availableDateKeys = useMemo(
    () => new Set(slotsByDate.keys()),
    [slotsByDate],
  )

  // ── Auto-select earliest slot once data loads ────────────────────────
  // Only fires when there's no selection yet — preserves manual picks
  // across re-renders.
  useEffect(() => {
    if (slots.length === 0 || selectedSlot) return
    const earliest = [...slots].sort((a, b) =>
      a.slotDatetime.localeCompare(b.slotDatetime),
    )[0]
    setSelectedSlot(earliest)
    const d = startOfDay(new Date(earliest.slotDatetime))
    setSelectedDate(d)
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() })
  }, [slots, selectedSlot])

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
    const k = dateKey(d)
    if (!availableDateKeys.has(k)) return
    setSelectedDate(d)
    // Auto-select earliest slot on the newly chosen day
    const daySlots = slotsByDate.get(k)
    setSelectedSlot(daySlots?.[0] ?? null)
  }

  function handleNextDay() {
    // Walk forward to the next day with available slots (skip empty days).
    let cursor = addDays(selectedDate, 1)
    for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
      if (availableDateKeys.has(dateKey(cursor))) break
      cursor = addDays(cursor, 1)
    }
    if (!availableDateKeys.has(dateKey(cursor))) return  // no future days available
    setSelectedDate(cursor)
    setViewMonth({ year: cursor.getFullYear(), month: cursor.getMonth() })
    const daySlots = slotsByDate.get(dateKey(cursor))
    setSelectedSlot(daySlots?.[0] ?? null)
  }

  function getDayVariant(day: number): 'past' | 'today' | 'selected' | 'future' | 'disabled' {
    const d = startOfDay(new Date(viewMonth.year, viewMonth.month, day))
    if (d < today) return 'past'
    const k = dateKey(d)
    const isAvailable = availableDateKeys.has(k)
    if (isSameDay(d, selectedDate) && isAvailable) return 'selected'
    if (!isAvailable) return 'disabled'
    if (isSameDay(d, today)) return 'today'
    return 'future'
  }

  // Slots for the currently-selected day, partitioned by category.
  const selectedDayBuckets = useMemo(() => {
    const k = dateKey(selectedDate)
    const daySlots = slotsByDate.get(k) ?? []
    return categorizeSlots(daySlots)
  }, [selectedDate, slotsByDate])

  async function handleSave() {
    if (isNavigating) return
    if (!format) {
      setFormatError('Please select a format.')
      return
    }
    if (!selectedSlot) {
      setHoldError('Please pick an available time slot.')
      return
    }
    setFormatError('')
    setHoldError(null)
    setIsNavigating(true)

    // Reserve the slot. Hold lives 10 minutes — enough for /checkout
    // submission. /checkout reads the hold, displays a countdown, and
    // surrenders it on expiry or back-navigation.
    let reserveResp: Response
    try {
      reserveResp = await fetch('/api/availability/reserve', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId:   selectedSlot.providerId,
          slotDatetime: selectedSlot.slotDatetime,
          contactType:  selectedSlot.contactType,
          sessionToken: getSessionToken(),
        }),
      })
    } catch (err: any) {
      setHoldError(err?.message ?? 'Network error reserving the slot.')
      setIsNavigating(false)
      return
    }

    const reserved = await reserveResp.json().catch(() => ({}))

    if (reserveResp.status === 409) {
      // Lost the race — refetch availability and let them pick another.
      setHoldError('That slot was just taken. Please pick another time.')
      setSelectedSlot(null)
      setRefetchCounter((c) => c + 1)
      setIsNavigating(false)
      return
    }
    if (!reserveResp.ok || !reserved?.holdId) {
      setHoldError(reserved?.detail ?? reserved?.error ?? 'Could not reserve your slot. Please try again.')
      setIsNavigating(false)
      return
    }

    const slotTimeLabel = formatSlotTime(selectedSlot.slotDatetime)
    const tz = shortTzAbbr(selectedSlot.slotDatetime)
    const slotTimeWithTz = tz ? `${slotTimeLabel} ${tz}` : slotTimeLabel
    saveStep(
      13,
      {
        question: QUESTION_TEXT,
        bubbles: [`${language} · ${format} · ${formatDateLabel(selectedDate)} · ${slotTimeWithTz}`],
      },
      {
        // Existing fields kept for back-nav restore + chat-history bubbles.
        language,
        format,
        date: selectedDate.toISOString(),
        time: slotTimeWithTz,
        // New fields the worker uses to promote the hold into an
        // appointments row at sync time.
        holdId:         reserved.holdId,
        providerId:     selectedSlot.providerId,
        healthieUserId: selectedSlot.healthieUserId,
        slotDatetime:   selectedSlot.slotDatetime,
        contactType:    selectedSlot.contactType,
        providerName:   selectedSlot.providerName,
        expiresAt:      reserved.expiresAt,
      },
    )
    router.push(NEXT_ROUTE)
  }

  return (
    <>
      <DisqualificationGate />
      <BackHeader backHref="/get-started/questionnaire/desired-treatments" progress={PROGRESS} />

      <main
        id="main-content"
        tabIndex={-1}
        className={`overflow-y-auto bg-white focus:outline-none ${done ? 'pb-[58px] md:pb-[138px]' : 'pb-8'}`}
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[560px] md:px-0 flex flex-col gap-6 pt-4 md:pt-6">

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
            <h1
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
            </h1>
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
                  <div className="relative opacity-50">
                    <select
                      id="language"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      disabled
                      className="w-full h-[42px] pl-3 pr-9 border border-[#e4e4e7] rounded-lg bg-white text-base text-[#09090b] shadow-sm appearance-none cursor-not-allowed focus:outline-none focus:border-brand-blue transition-colors"
                    >
                      <option>English</option>
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
                      className={`w-full h-[42px] pl-3 pr-9 border rounded-lg bg-white text-base shadow-sm appearance-none focus:outline-none focus:border-brand-blue transition-colors ${
                        requiresSync ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${!format ? 'text-[#a1a1aa]' : 'text-[#09090b]'} ${
                        formatError ? 'border-red-600' : 'border-[#e4e4e7]'
                      }`}
                    >
                      {!requiresSync && <option value="" disabled hidden>Phone / Video</option>}
                      {!requiresSync && <option value="Phone">Phone</option>}
                      <option value="Video">Video</option>
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
                    className="flex items-center gap-1.5 flex-1 min-w-0 hover:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] rounded"
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
                          className="p-[5px] rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
                          aria-label="Previous year"
                        >
                          <CalChevronLeftIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerYear(y => y + 1)}
                          className="p-[5px] rounded-full hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
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
                          className="p-[5px] rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
                          aria-label="Previous month"
                        >
                          <CalChevronLeftIcon />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-[5px] rounded-full hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
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
                          aria-current={isActive ? 'true' : undefined}
                          className={`h-9 rounded-full text-[14px] leading-[1.43] tracking-[0.17px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1 ${
                            isActive
                              ? 'bg-brand-navy text-white'
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
                                  disabled={variant === 'past' || variant === 'disabled'}
                                  aria-current={variant === 'selected' ? 'date' : undefined}
                                  aria-label={`${MONTH_NAMES[viewMonth.month]} ${day}${variant === 'today' ? ', today' : ''}${variant === 'selected' ? ', selected' : ''}${variant === 'disabled' ? ', no slots available' : ''}`}
                                  className={`flex items-center justify-center size-9 rounded-full text-[14px] leading-[1.43] tracking-[0.17px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1 ${
                                    variant === 'selected'
                                      ? 'bg-brand-navy text-white'
                                      : variant === 'today'
                                      ? 'border border-[rgba(0,0,0,0.54)] text-[rgba(0,0,0,0.87)] hover:bg-gray-100'
                                      : variant === 'past' || variant === 'disabled'
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

              {/* ── Hold/availability errors ── */}
              {(holdError || loadError) && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-sm text-red-700 leading-5" role="alert">
                    {holdError ?? loadError}
                  </p>
                </div>
              )}

              {/* ── Time slot categories ── */}
              {slotsLoading ? (
                <p className="text-sm text-[rgba(0,0,0,0.6)] py-4">Loading availability…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-red-700 py-4">
                  No available slots in the next {LOOKAHEAD_DAYS} days.
                  Please check back later.
                </p>
              ) : (
                ([
                  { label: 'Morning',   bucket: selectedDayBuckets.morning },
                  { label: 'Afternoon', bucket: selectedDayBuckets.afternoon },
                  { label: 'Evening',   bucket: selectedDayBuckets.evening },
                ] as const).map(({ label, bucket }) => {
                  if (bucket.length === 0) return null
                  return (
                    <div key={label} className="flex flex-col gap-2">
                      <p className="text-[12px] leading-[2.66] tracking-[1px] uppercase text-[rgba(0,0,0,0.87)]">
                        {label}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {bucket.map((slot) => {
                          const timeLabel = formatSlotTime(slot.slotDatetime)
                          const isSelected =
                            !!selectedSlot && selectedSlot.slotDatetime === slot.slotDatetime
                          return (
                            <button
                              key={slot.slotDatetime + slot.providerId}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              aria-pressed={isSelected}
                              className={`relative h-[42px] flex items-center justify-center px-2 rounded-lg text-base font-medium leading-6 whitespace-nowrap overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1 ${
                                isSelected
                                  ? 'border border-brand-navy text-white shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.15)]'
                                  : 'bg-white border border-[#e4e4e7] text-[#09090b] shadow-sm hover:border-brand-blue/40'
                              }`}
                              style={isSelected
                                ? { background: 'linear-gradient(to right, var(--brand-navy), #233d5a)' }
                                : undefined
                              }
                            >
                              {timeLabel}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}

              {/* ── Next day link ── */}
              <button
                type="button"
                onClick={handleNextDay}
                className="flex items-center gap-3 px-4 py-2 text-base font-medium text-brand-blue hover:opacity-75 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] rounded-lg self-end"
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
            w-full md:w-[560px] h-[42px] px-4 overflow-hidden
            rounded-br-[36px] rounded-tl-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3b82f6]
          "
          style={{ background: 'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-blue) 64.61%, var(--brand-mint) 100%)' }}
        >
          {isNavigating ? 'Saving…' : 'Save and continue'}
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
