'use client'

/*
 * ProtocolsSection.tsx — Filterable treatment card grid
 *
 * KEY CONCEPT: This is a great example of WHY you need React.
 *
 * In your old HTML, this was done with:
 *   onclick="filter('all', this)"
 *   document.querySelectorAll('.card').forEach(card => {
 *     card.classList.toggle('hidden', ...)
 *   })
 *
 * That's imperative DOM manipulation — you tell the browser exactly
 * what to toggle. In React, you describe WHAT the UI should look like
 * for a given state, and React figures out what to change:
 *
 *   const [activeFilter, setActiveFilter] = useState('all')
 *   // Then in JSX: only render cards that match the filter
 *
 * This is "declarative" UI — less bug-prone, easier to reason about.
 */

import { useState } from 'react'
import Link from 'next/link'
import { protocols, filterCategories, type ProtocolCard } from '@/lib/protocols'

export function ProtocolsSection() {
  const [activeFilter, setActiveFilter] = useState('all')

  // Filter cards — in React, we just filter the data array
  // and let React re-render only what changed
  const visibleCards = activeFilter === 'all'
    ? protocols
    : protocols.filter((p) => p.categories.includes(activeFilter))

  return (
    <section id="protocols" className="py-20 px-6 md:px-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extralight tracking-tight text-navy">
          Explore Our Protocols
        </h2>
        <p className="text-sm text-muted font-light leading-relaxed mt-3">
          Browse our physician-prescribed peptide therapies below, or take a
          quick assessment and let our providers recommend the right protocol
          for you.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-bg border border-border text-xs text-muted">
          <span>&#9877;&#65039;</span> All peptides require provider review — via
          medical assessment or video visit
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {filterCategories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveFilter(cat.key)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
              activeFilter === cat.key
                ? 'bg-brand-gradient text-white shadow-md'
                : 'bg-bg border border-border text-muted hover:border-blue-brand/30 hover:text-navy'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Card grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {visibleCards.map((card) => (
          <TreatmentCard key={card.slug} card={card} />
        ))}
      </div>
    </section>
  )
}

/*
 * TreatmentCard — Individual protocol card
 *
 * KEY CONCEPT: Component extraction.
 * In your HTML, each card was 20+ lines of repeated markup.
 * Here, it's a reusable component that takes data as props.
 * Change the card design once → all 16 cards update.
 */
const YOUTUBE_URL = 'https://www.youtube.com/@PreventiveMD'

function TreatmentCard({ card }: { card: ProtocolCard }) {
  return (
    <div
      className="bg-white border border-border rounded-[18px] flex flex-col transition-all duration-200 hover:shadow-[0_8px_28px_rgba(0,113,188,0.09)] hover:-translate-y-0.5 cursor-pointer group"
      style={{ padding: '26px 26px 22px' }}
    >
      {/* Category badges — uppercase, bold, pill-shaped like live site */}
      <div className="flex flex-wrap gap-[5px] mb-[13px]">
        {card.badges.map((b, i) => (
          <span
            key={i}
            className="inline-block rounded-full shrink-0"
            style={{
              backgroundColor: b.bg,
              color: b.text,
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              padding: '4px 10px',
            }}
          >
            {b.label}
          </span>
        ))}
      </div>

      {/* Name */}
      {card.hasDetailPage ? (
        <Link href={`/treatments/${card.slug}`} className="no-underline">
          <h3 className="text-navy group-hover:text-blue-brand transition-colors" style={{ fontSize: '1.13rem', fontWeight: 600, lineHeight: 1.25, marginBottom: '3px' }}>
            {card.name}
          </h3>
        </Link>
      ) : (
        <h3 className="text-navy" style={{ fontSize: '1.13rem', fontWeight: 600, lineHeight: 1.25, marginBottom: '3px' }}>
          {card.name}
        </h3>
      )}

      {/* Subtitle */}
      <div style={{ fontSize: '0.76rem', color: 'var(--muted)', fontWeight: 300, marginBottom: '11px' }}>
        {card.also}
      </div>

      {/* Description */}
      <p className="flex-1" style={{ fontSize: '0.85rem', color: '#4a6a7a', lineHeight: 1.7, fontWeight: 300, marginBottom: '18px' }}>
        {card.desc}
      </p>

      {/* Footer: price + CTA */}
      <div className="flex items-center justify-between border-t border-border gap-3" style={{ paddingTop: '14px' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Starting from</div>
          <div className="text-navy" style={{ fontSize: '0.97rem', fontWeight: 600 }}>{card.price}</div>
        </div>
        <Link
          href={card.ctaHref}
          className="bg-brand-gradient text-white no-underline whitespace-nowrap hover:opacity-90 transition-opacity"
          style={{ fontSize: '0.78rem', fontWeight: 500, padding: '8px 16px', borderRadius: '999px' }}
        >
          {card.ctaLabel}
        </Link>
      </div>

      {/* YouTube link */}
      <a
        href={YOUTUBE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-[7px] border-t border-border no-underline transition-colors hover:text-[#cc0000]"
        style={{ paddingTop: '9px', marginTop: '10px', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}
      >
        <svg className="shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.5 6.2s-.3-1.7-1-2.4c-.9-1-1.9-1-2.4-1C17.1 2.6 12 2.6 12 2.6s-5.1 0-8.1.2c-.5.1-1.5.1-2.4 1-.7.7-1 2.4-1 2.4S.3 8.1.3 10v1.8c0 1.9.2 3.8.2 3.8s.3 1.7 1 2.4c.9 1 2.1.9 2.6 1C5.8 19.2 12 19.2 12 19.2s5.1 0 8.1-.3c.5-.1 1.5-.1 2.4-1 .7-.7 1-2.4 1-2.4s.2-1.9.2-3.8V10c0-1.9-.2-3.8-.2-3.8zM9.7 13.5V7.9l6.5 2.8-6.5 2.8z" />
        </svg>
        Learn more on YouTube
      </a>
    </div>
  )
}
