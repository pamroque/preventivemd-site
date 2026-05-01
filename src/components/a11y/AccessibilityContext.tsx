'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

export type Language = 'en' | 'es'

export interface AccessibilitySettings {
  animations: boolean
  enhancedReadability: boolean
  language: Language
  setAnimations: (v: boolean) => void
  setEnhancedReadability: (v: boolean) => void
  setLanguage: (v: Language) => void
}

const DEFAULTS = {
  animations: true,
  enhancedReadability: false,
  language: 'en' as Language,
}

const Ctx = createContext<AccessibilitySettings>({
  ...DEFAULTS,
  setAnimations: () => {},
  setEnhancedReadability: () => {},
  setLanguage: () => {},
})

const STORAGE_KEY = 'pmd:a11y'
const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type Persisted = Partial<typeof DEFAULTS>

function readPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Persisted
  } catch {
    return {}
  }
}

function writePersisted(next: Persisted) {
  try {
    const current = readPersisted()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...next }))
  } catch {
    // localStorage unavailable (private mode, quota) — silently no-op.
  }
}

/**
 * Provider for site-wide a11y/UX preferences (animations, enhanced readability,
 * language). Persists to localStorage and syncs `data-animations`,
 * `data-readability`, and `lang` on <html> so CSS can react globally.
 *
 * Animation default follows the OS-level `prefers-reduced-motion` setting; if
 * the user toggles the menu switch we treat that as an explicit override that
 * sticks across system-pref changes until cleared from localStorage.
 */
export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [animations, setAnimationsState] = useState(DEFAULTS.animations)
  const [animationsExplicit, setAnimationsExplicit] = useState(false)
  const [enhancedReadability, setEnhancedReadabilityState] = useState(
    DEFAULTS.enhancedReadability,
  )
  const [language, setLanguageState] = useState<Language>(DEFAULTS.language)

  // Hydrate from localStorage; fall back to OS reduce-motion when no explicit
  // user choice exists.
  useEffect(() => {
    const p = readPersisted()
    if (typeof p.animations === 'boolean') {
      setAnimationsState(p.animations)
      setAnimationsExplicit(true)
    } else {
      setAnimationsState(!window.matchMedia(REDUCE_MOTION_QUERY).matches)
    }
    if (typeof p.enhancedReadability === 'boolean')
      setEnhancedReadabilityState(p.enhancedReadability)
    if (p.language === 'en' || p.language === 'es') setLanguageState(p.language)
  }, [])

  // Track system pref changes — only honor them when the user hasn't
  // explicitly chosen via the menu.
  useEffect(() => {
    if (animationsExplicit) return
    const mq = window.matchMedia(REDUCE_MOTION_QUERY)
    const onChange = (e: MediaQueryListEvent) => setAnimationsState(!e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [animationsExplicit])

  // Reflect settings on <html>. Other CSS targets these attributes.
  useEffect(() => {
    const html = document.documentElement
    html.dataset.animations = animations ? 'on' : 'off'
    html.dataset.readability = enhancedReadability ? 'enhanced' : 'default'
    html.lang = language
  }, [animations, enhancedReadability, language])

  const setAnimations = useCallback((v: boolean) => {
    setAnimationsState(v)
    setAnimationsExplicit(true)
    writePersisted({ animations: v })
  }, [])

  const setEnhancedReadability = useCallback((v: boolean) => {
    setEnhancedReadabilityState(v)
    writePersisted({ enhancedReadability: v })
  }, [])

  const setLanguage = useCallback((v: Language) => {
    setLanguageState(v)
    writePersisted({ language: v })
  }, [])

  return (
    <Ctx.Provider
      value={{
        animations,
        enhancedReadability,
        language,
        setAnimations,
        setEnhancedReadability,
        setLanguage,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAccessibilitySettings() {
  return useContext(Ctx)
}
