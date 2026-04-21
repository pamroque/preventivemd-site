'use client'

import { useEffect, useRef, useState } from 'react'

// Figma asset URLs (valid for 7 days from generation)
const MEDICATION_IMAGE_URL =
  'https://www.figma.com/api/mcp/asset/ba330a34-0013-4388-a4bc-40b5574691d6'

type MedicationName =
  | 'GHK-Cu'
  | 'Glutathione'
  | 'NAD+'
  | 'Semaglutide'
  | 'Sermorelin'
  | 'Tirzepatide'
  | 'Wegovy'
  | 'Zepbound'

interface MedicationBadgeConfig {
  bg: string
  text: string
  label: React.ReactNode
}

const BADGE_CONFIG: Record<MedicationName, MedicationBadgeConfig> = {
  'GHK-Cu': {
    bg: 'bg-[#fef3c7]',
    text: 'text-[#b45309]',
    label: 'GHK-Cu',
  },
  Glutathione: {
    bg: 'bg-[#ffe4e6]',
    text: 'text-[#be123c]',
    label: 'Glutathione',
  },
  'NAD+': {
    bg: 'bg-[#dcfce7]',
    text: 'text-[#15803d]',
    label: 'NAD+',
  },
  Semaglutide: {
    bg: 'bg-[#e0e7ff]',
    text: 'text-[#4338ca]',
    label: 'Semaglutide',
  },
  Sermorelin: {
    bg: 'bg-[#f3e8ff]',
    text: 'text-[#7e22ce]',
    label: 'Sermorelin',
  },
  Tirzepatide: {
    bg: 'bg-[#d1fae5]',
    text: 'text-[#047857]',
    label: 'Tirzepatide',
  },
  Wegovy: {
    bg: 'bg-[#dbeafe]',
    text: 'text-[#1d4ed8]',
    label: (
      <>
        Wegovy<sup className="text-[7px]">®</sup>
      </>
    ),
  },
  Zepbound: {
    bg: 'bg-[#ecfccb]',
    text: 'text-[#4d7c0f]',
    label: (
      <>
        Zepbound<sup className="text-[7px]">®</sup>
      </>
    ),
  },
}

const MEDICATIONS: MedicationName[] = [
  'GHK-Cu',
  'Glutathione',
  'NAD+',
  'Semaglutide',
  'Sermorelin',
  'Tirzepatide',
  'Wegovy',
  'Zepbound',
]

function MedicationItem({ name }: { name: MedicationName }) {
  const cfg = BADGE_CONFIG[name]
  return (
    <div className="flex items-center gap-1 shrink-0" aria-label={typeof cfg.label === 'string' ? cfg.label : name}>
      {/* Vial image */}
      <div className="h-[72px] w-[38px] relative shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MEDICATION_IMAGE_URL}
          alt=""
          aria-hidden="true"
          className="absolute max-w-none"
          style={{
            height: '111.62%',
            left: '-106.45%',
            top: '-6.99%',
            width: '317.27%',
          }}
        />
      </div>
      {/* Badge */}
      <span
        className={`${cfg.bg} ${cfg.text} text-xs font-normal leading-4 px-1.5 py-1 rounded-xl shrink-0`}
      >
        {cfg.label}
      </span>
    </div>
  )
}

/**
 * Auto-scrolling medication carousel.
 * - Scrolls at 24-second cycle speed
 * - Pauses on mouseenter / touchstart (press-and-hold)
 * - Respects prefers-reduced-motion
 */
export default function MedicationCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const animRef = useRef<number | null>(null)
  const posRef = useRef(0)

  // Duplicate items for seamless infinite scroll
  const items = [...MEDICATIONS, ...MEDICATIONS]

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const track = trackRef.current
    if (!track) return

    // Width of one full set (half of total duplicated track)
    const fullWidth = track.scrollWidth / 2
    const duration = 24000 // ms for one full loop
    const pixelsPerMs = fullWidth / duration

    let lastTime: number | null = null

    function step(now: number) {
      if (!paused) {
        if (lastTime !== null) {
          posRef.current += pixelsPerMs * (now - lastTime)
          if (posRef.current >= fullWidth) {
            posRef.current -= fullWidth
          }
          if (track) track.style.transform = `translateX(-${posRef.current}px)`
        }
        lastTime = now
      } else {
        lastTime = null
      }
      animRef.current = requestAnimationFrame(step)
    }

    animRef.current = requestAnimationFrame(step)
    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current)
    }
  }, [paused])

  return (
    <div
      className="relative overflow-hidden"
      aria-label="Available medications carousel"
      role="region"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-9 z-10 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(to right, white, transparent)',
        }}
      />
      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-9 z-10 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(to left, white, transparent)',
        }}
      />

      {/* Track */}
      <div
        ref={trackRef}
        className="flex gap-4 items-center will-change-transform"
        style={{ transform: 'translateX(0)' }}
      >
        {items.map((name, i) => (
          <MedicationItem key={`${name}-${i}`} name={name} />
        ))}
      </div>
    </div>
  )
}
