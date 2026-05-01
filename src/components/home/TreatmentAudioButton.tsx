'use client'

import { useEffect, useRef } from 'react'

/** Heroicons-outline/speaker-wave */
function SpeakerWaveIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? 'size-6'}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
      />
    </svg>
  )
}

type Props = {
  /** Spoken pronunciation when no recorded clip is provided. */
  name: string
  /**
   * Optional pre-recorded clip path (e.g. `/assets/audio/glutathione.mp3`).
   * When set, the button plays this file. When omitted, the button falls back
   * to the browser's SpeechSynthesis API. To upgrade a treatment from Web
   * Speech to a recording, add `audioSrc` to that treatment's data entry —
   * no other changes needed.
   */
  audioSrc?: string
}

export default function TreatmentAudioButton({ name, audioSrc }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Stop any in-flight playback on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (typeof window !== 'undefined') {
        window.speechSynthesis?.cancel()
      }
    }
  }, [])

  const play = () => {
    if (typeof window === 'undefined') return
    // Cancel any other clip / utterance currently playing — including ones
    // started from a sibling card — so they don't overlap.
    window.speechSynthesis?.cancel()
    audioRef.current?.pause()

    if (audioSrc) {
      const audio = new Audio(audioSrc)
      audioRef.current = audio
      audio.play().catch(() => {
        /* swallow autoplay/permission errors */
      })
      return
    }

    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(name)
      // Slightly slower than default for medical-term clarity.
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={`Play audio pronunciation for ${name}`}
      // p-1 -m-1 grows the click target to 32x32 without shifting layout
      // (clears WCAG 2.5.8 minimum 24x24 with comfortable margin).
      className="rounded p-1 -m-1 text-[#09090b]/70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
    >
      <SpeakerWaveIcon className="size-6" />
    </button>
  )
}
