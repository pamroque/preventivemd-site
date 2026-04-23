'use client'

import { useEffect, useState } from 'react'
import { currentStepAnimDuration } from '@/components/ui/ChatHistory'

const WORD_DELAY_MS = 80
const DONE_DELAY_MS = 200
const START_DELAY_MS = 100

/**
 * Drives the standard Eve-avatar question animation:
 *   1. fades the prior step's bubbles in
 *   2. types the new question word by word
 *   3. flips `done` so the page can reveal its form
 *
 * Pass an empty/null question to hold the animation until the page has
 * resolved the text it wants to type (e.g. after reading sessionStorage).
 */
export function useEveTyping(question: string | null, priorBubbleCount: number) {
  const words = question ? question.split(' ') : []

  const [animateBubbles, setAnimateBubbles] = useState(false)
  const [visibleWords, setVisibleWords] = useState(0)
  const [typingStarted, setTypingStarted] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimateBubbles(true), START_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!animateBubbles) return
    const t = setTimeout(
      () => setTypingStarted(true),
      currentStepAnimDuration(priorBubbleCount),
    )
    return () => clearTimeout(t)
  }, [animateBubbles, priorBubbleCount])

  useEffect(() => {
    if (!typingStarted || words.length === 0) return
    if (visibleWords < words.length) {
      const t = setTimeout(() => setVisibleWords((w) => w + 1), WORD_DELAY_MS)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setDone(true), DONE_DELAY_MS)
    return () => clearTimeout(t)
  }, [typingStarted, visibleWords, words.length])

  return { animateBubbles, visibleWords, typingStarted, done, words }
}
