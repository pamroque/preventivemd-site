'use client'

import Link from 'next/link'
import Image from 'next/image'
import FoundersMessageDialog from './FoundersMessageDialog'
import MedicalAdvisorsDialog from './MedicalAdvisorsDialog'

/**
 * Forward a click on plain tile area to the inner CTA. Clicks that already
 * land on an interactive element (or inside an open dialog) are left alone.
 */
function forwardTileClick(e: React.MouseEvent<HTMLDivElement>) {
  const target = e.target as HTMLElement
  if (target.closest('a, button, input, textarea, select, dialog')) return
  const cta = e.currentTarget.querySelector('a, button') as HTMLElement | null
  cta?.click()
}

type TileProps = {
  title: string
  description: string
  /** CTA label for the auto-rendered link. Ignored when `ctaSlot` is set. */
  ctaLabel?: string
  /** CTA href for the auto-rendered link. Ignored when `ctaSlot` is set. */
  ctaHref?: string
  /** Custom CTA element — overrides the default Link when provided. */
  ctaSlot?: React.ReactNode
  /** Background image rendered behind content. */
  bgImage?: { src: string; objectPosition?: string; opacity?: number }
  /** Single column tile uses full width on desktop. */
  fullWidth?: boolean
}

function Tile({
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaSlot,
  bgImage,
  fullWidth = false,
}: TileProps) {
  return (
    <div
      onClick={forwardTileClick}
      className={`tile-cta-magnify relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-[24px] p-5 md:gap-6 md:rounded-[36px] md:p-8 ${
        fullWidth ? 'w-full' : 'flex-1 min-w-0'
      }`}
    >
      {bgImage && (
        <div aria-hidden="true" className="tile-bg absolute inset-0 pointer-events-none">
          <Image
            src={bgImage.src}
            alt=""
            fill
            sizes={fullWidth ? '100vw' : '(min-width: 768px) 50vw, 100vw'}
            className="object-cover"
            style={{
              objectPosition: bgImage.objectPosition,
              opacity: bgImage.opacity,
            }}
          />
        </div>
      )}
      <div className="relative flex flex-col gap-2 text-[#09090b]">
        <h3 className="font-serif italic leading-[1.3] text-[2rem] md:text-4xl">
          {title}
        </h3>
        <p className="text-base leading-6">{description}</p>
      </div>
      {ctaSlot ?? (
        ctaLabel && ctaHref ? (
          <Link
            href={ctaHref}
            className="relative inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.96px] leading-4 text-[#09090b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] md:leading-5"
          >
            {ctaLabel}
          </Link>
        ) : null
      )}
    </div>
  )
}

// Width/height match each badge's natural aspect at ~64px tall so the row
// reads as a single visual weight. The WCAG mark is wide-format (~2.12:1) and
// Figma sizes it down to 42px tall so it doesn't dominate the row.
// `href` (optional) wraps the badge in an external link that opens in a new tab.
const BADGES = [
  { src: '/assets/badge-legit.png', alt: 'LegitScript Certified', width: 58, height: 64, href: '#' /* TBD */ },
  { src: '/assets/badge-hipaa.png', alt: 'HIPAA Compliant', width: 55, height: 64 },
  { src: '/assets/badge-wcag.png', alt: 'WCAG AA Compliant', width: 108, height: 51 },
  { src: '/assets/badge-ssl.png', alt: 'SSL Secure', width: 54, height: 54 },
] as const

export default function AboutSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="flex scroll-mt-16 flex-col items-center gap-9 md:scroll-mt-20 md:gap-12"
    >
      {/* Title */}
      <div className="flex w-full flex-col gap-1.5 text-center md:gap-3">
        <p className="text-sm font-medium leading-5 text-[#71717a] md:text-base md:leading-6">
          About PreventiveMD
        </p>
        <h2
          id="about-heading"
          className="font-extralight leading-[1.1] text-[#09090b]"
        >
          <span className="font-serif italic text-[2.625rem] md:text-[4rem]">No shortcuts</span>
          <span className="text-4xl md:text-[3.375rem]"> when it comes to care</span>
        </h2>
      </div>

      {/* Tiles */}
      <div className="flex w-full flex-col gap-4">
        <Tile
          fullWidth
          title="Radical transparency"
          description="Honest outcomes and tradeoffs—including telling you when a treatment isn't right for you. Every patient leaves understanding their protocol, not just following it."
          ctaSlot={<FoundersMessageDialog />}
          bgImage={{ src: '/assets/home/tile-transparency.png', objectPosition: 'center bottom' }}
        />

        <div className="flex flex-col gap-4 md:flex-row">
          <Tile
            title="Physician-vetted care"
            description="Every protocol we offer is curated by our medical advisors — a small, hand-selected group of physicians who share our philosophy of personalized, prevention-focused care."
            ctaSlot={<MedicalAdvisorsDialog />}
            bgImage={{ src: '/assets/home/tile-vetted.png', objectPosition: 'right top' }}
          />
          <Tile
            title="Pharmacy-grade sourcing"
            description="We work exclusively with state-licensed, U.S.-based 503A compounding pharmacies, which follow strict quality standards, and are subject to FDA oversight."
            ctaLabel="About 503A Pharmacies"
            ctaHref="#faq-503a-pharmacies"
            bgImage={{ src: '/assets/home/tile-sourcing.png', objectPosition: 'center bottom' }}
          />
        </div>

        {/* Trust + badges */}
        <div className="flex flex-col items-start gap-3 rounded-[24px] border border-[#e4e4e7] bg-white p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-[36px] md:px-8 md:py-6">
          <h3 className="font-serif italic leading-[1.3] text-[2rem] text-[#09090b] md:text-4xl">
            Trusted &amp; verified
          </h3>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            {BADGES.map((b) => {
              const href = 'href' in b ? b.href : undefined
              const inner = (
                <Image
                  src={b.src}
                  alt={b.alt}
                  fill
                  sizes={`${b.width}px`}
                  className="object-contain"
                />
              )
              return href ? (
                <a
                  key={b.src}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${b.alt} (opens in new tab)`}
                  className="relative shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
                  style={{ width: b.width, height: b.height }}
                >
                  {inner}
                </a>
              ) : (
                <div
                  key={b.src}
                  className="relative shrink-0"
                  style={{ width: b.width, height: b.height }}
                >
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile-style gradient CTA — present on mobile per Figma */}
      <Link
        href="/get-started"
        className="relative flex h-[42px] w-full items-center justify-center gap-3 overflow-hidden rounded-br-[36px] rounded-tl-[36px] px-12 py-2 text-base font-medium leading-6 text-white shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.15)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 md:max-w-[360px]"
        style={{
          background:
            'linear-gradient(90deg, var(--brand-blue) 0%, var(--brand-blue) 64.61%, var(--brand-mint) 100%)',
        }}
      >
        Get started
      </Link>
    </section>
  )
}
