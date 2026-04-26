'use client'

import { useEffect, useState } from 'react'
import { currentStepAnimDuration } from '@/components/ui/ChatHistory'

const WORD_DELAY_MS = 80
const DONE_DELAY_MS = 200
const START_DELAY_MS = 100

/**
 * Tracks the user's `prefers-reduced-motion` preference. Starts as `false`
 * so SSR and initial client render match; the real value is set in useEffect
 * so animation-gated content doesn't cause a hydration mismatch.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/**
 * Drives the standard Eve-avatar question animation:
 *   1. fades the prior step's bubbles in
 *   2. types the new question word by word
 *   3. flips `done` so the page can reveal its form
 *
 * Pass an empty/null question to hold the animation until the page has
 * resolved the text it wants to type (e.g. after reading sessionStorage).
 *
 * `options.pauseBeforeWord` adds a one-time longer wait before revealing
 * the word at that index — feels like Eve hit enter twice to start a new
 * paragraph. Defaults to 700ms, override with `options.pauseMs`.
 *
 * Respects `prefers-reduced-motion: reduce` by skipping every delay and
 * flipping all phases to their final state immediately, so keyboard and
 * assistive-tech users don't wait on the form to reveal.
 */
export function useEveTyping(
  question: string | null,
  priorBubbleCount: number,
  options?: { pauseBeforeWord?: number; pauseMs?: number },
) {
  const words = question ? question.split(' ') : []
  const pauseBeforeWord = options?.pauseBeforeWord
  const pauseMs = options?.pauseMs ?? 700

  const reducedMotion = usePrefersReducedMotion()

  const [animateBubbles, setAnimateBubbles] = useState(false)
  const [visibleWords, setVisibleWords] = useState(0)
  const [typingStarted, setTypingStarted] = useState(false)
  const [done, setDone] = useState(false)

  // Reduced motion: jump straight to the final state once the question and
  // preference are known. Re-runs if the question text arrives later.
  useEffect(() => {
    if (!reducedMotion) return
    setAnimateBubbles(true)
    setTypingStarted(true)
    setVisibleWords(words.length)
    setDone(true)
  }, [reducedMotion, words.length])

  useEffect(() => {
    if (reducedMotion) return
    const t = setTimeout(() => setAnimateBubbles(true), START_DELAY_MS)
    return () => clearTimeout(t)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    if (!animateBubbles) return
    const t = setTimeout(
      () => setTypingStarted(true),
      currentStepAnimDuration(priorBubbleCount),
    )
    return () => clearTimeout(t)
  }, [reducedMotion, animateBubbles, priorBubbleCount])

  useEffect(() => {
    if (reducedMotion) return
    if (!typingStarted || words.length === 0) return
    if (visibleWords < words.length) {
      const delay = pauseBeforeWord !== undefined && visibleWords === pauseBeforeWord
        ? pauseMs
        : WORD_DELAY_MS
      const t = setTimeout(() => setVisibleWords((w) => w + 1), delay)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setDone(true), DONE_DELAY_MS)
    return () => clearTimeout(t)
  }, [reducedMotion, typingStarted, visibleWords, words.length, pauseBeforeWord, pauseMs])

  return { animateBubbles, visibleWords, typingStarted, done, words }
}
