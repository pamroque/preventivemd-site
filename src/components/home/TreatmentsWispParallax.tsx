'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'

/**
 * Drift speed for the wisp. 0 = no parallax (scrolls with page),
 * 1 = fully fixed in viewport. 0.3 = drifts at ~70% of scroll speed.
 * Tune to taste; revert by removing this component.
 */
const PARALLAX_FACTOR = 0.3

/**
 * How far above the wisp's natural position it's allowed to drift, in px.
 * Clamping prevents the wisp from crossing the Treatments section's top edge
 * and visually leaking into the Peptides section above. With the wisp anchored
 * at top:120 of the section, a clamp of -100 keeps it at least 20px below the
 * section's top while still allowing parallax to be active across most of the
 * section's visibility window.
 */
const MIN_OFFSET = -100

/**
 * Subtle parallax for the Treatments section's decorative wisp.
 *
 * The wisp's `transform: translateY` is updated each animation frame while
 * the parent <section> is in view, derived from the section's
 * `getBoundingClientRect().top`. An IntersectionObserver gates the scroll
 * listener so we don't burn cycles when the section isn't visible. Honors
 * `prefers-reduced-motion`.
 *
 * Mounted as a thin client component so the rest of TreatmentsSection can
 * stay on the server. To revert: replace the <TreatmentsWispParallax />
 * call site with the original inline <div><Image /></div> wisp markup, and
 * delete this file.
 */
export default function TreatmentsWispParallax() {
  const topRef = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const top = topRef.current
    if (!top) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const section = top.closest('section')
    if (!section) return

    let rafId: number | null = null
    let inView = false

    const update = () => {
      rafId = null
      const rect = section.getBoundingClientRect()
      // Clamp to MIN_OFFSET so the wisp can't cross above the section's top
      // edge into the Peptides section above. Within the active range, offset
      // is `-rect.top * factor`, so the wisp drifts at `1 - factor` of scroll
      // speed (factor 0.3 → 70% speed).
      const offset = Math.max(MIN_OFFSET, -rect.top * PARALLAX_FACTOR)
      // Preserve the -50% X centering that the Tailwind class would otherwise
      // provide; setting `transform` inline overrides the utility.
      const transform = `translate3d(-50%, ${offset}px, 0)`
      if (topRef.current) topRef.current.style.transform = transform
      if (midRef.current) midRef.current.style.transform = transform
    }

    const onScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(update)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !inView) {
        inView = true
        window.addEventListener('scroll', onScroll, { passive: true })
        update()
      } else if (!entry.isIntersecting && inView) {
        inView = false
        window.removeEventListener('scroll', onScroll)
      }
    })
    observer.observe(section)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      {/* Top wisp — always rendered. On mobile we render it at 200vw so the
          central ~50% of the image fills the viewport. */}
      <div
        ref={topRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[120px] w-[200vw] -translate-x-1/2 md:w-screen"
        style={{ willChange: 'transform' }}
      >
        <Image
          src="/assets/home/treatments-wisp.png"
          alt=""
          width={1024}
          height={221}
          sizes="(min-width: 768px) 100vw, 200vw"
          loading="lazy"
          fetchPriority="low"
          className="h-auto w-full"
        />
      </div>

      {/* Mid-section repeat — mobile only, mirrored horizontally so the same
          asset reads as a different swirl ("crops from the other side"). */}
      <div
        ref={midRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 w-[200vw] -translate-x-1/2 md:hidden"
        style={{ willChange: 'transform' }}
      >
        <Image
          src="/assets/home/treatments-wisp.png"
          alt=""
          width={1024}
          height={221}
          sizes="200vw"
          loading="lazy"
          fetchPriority="low"
          className="h-auto w-full -scale-x-100"
        />
      </div>
    </>
  )
}
