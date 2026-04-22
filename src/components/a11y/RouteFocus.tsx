'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * WCAG 2.4.3 Focus Order — Next.js App Router does not move focus on
 * client-side navigation, so keyboard / screen-reader users lose their
 * place when a step submits. This component watches the pathname and,
 * after each transition, focuses the page's `#main-content` landmark so
 * AT announces the new page and Tab resumes from the top.
 *
 * Every page is expected to render `<main id="main-content" tabIndex={-1}>`
 * (see SkipLink.tsx). Skips the very first render so initial page load
 * doesn't steal focus from the browser's native landing behavior.
 */
export default function RouteFocus() {
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const target = document.getElementById('main-content')
    if (target) target.focus()
  }, [pathname])

  return null
}
