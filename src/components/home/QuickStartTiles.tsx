'use client'

import Link from 'next/link'
import Image from 'next/image'

/**
 * Forward a click on plain tile area to the inner CTA. Clicks that land on
 * an actual interactive element (or inside an open dialog) are left alone so
 * they handle themselves and don't double-fire.
 */
function forwardTileClick(e: React.MouseEvent<HTMLDivElement>) {
  const target = e.target as HTMLElement
  if (target.closest('a, button, input, textarea, select, dialog')) return
  const cta = e.currentTarget.querySelector('a, button') as HTMLElement | null
  cta?.click()
}

/** Heroicons-outline/chevron-double-down */
function ChevronDoubleDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? 'size-5'}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5"
      />
    </svg>
  )
}

/** Tile shell — common padding, rounded corners, optional bg image */
type TileProps = {
  children: React.ReactNode
  className?: string
  /** Background image rendered behind content. */
  bgImage?: { src: string; alt?: string; objectPosition?: string }
}

function Tile({ children, className = '', bgImage }: TileProps) {
  return (
    <div
      onClick={forwardTileClick}
      className={`tile-cta-magnify relative flex min-w-0 flex-1 cursor-pointer flex-col gap-4 overflow-hidden rounded-[24px] p-5 md:gap-6 md:rounded-[36px] md:p-8 ${className}`}
    >
      {bgImage && (
        <div aria-hidden="true" className="tile-bg absolute inset-0 pointer-events-none">
          <Image
            src={bgImage.src}
            alt={bgImage.alt ?? ''}
            fill
            sizes="(min-width: 768px) 33vw, 50vw"
            // The header tiles are above the fold; eager-load + priority so
            // they paint with the hero rather than flashing white while
            // Next.js optimizes the source PNG.
            priority
            className="object-cover"
            style={{ objectPosition: bgImage.objectPosition }}
          />
        </div>
      )}
      <div className="relative flex flex-1 flex-col gap-4 md:gap-6">{children}</div>
    </div>
  )
}

function TileText({
  stat,
  description,
  inverse = false,
}: {
  stat: string
  description: string
  inverse?: boolean
}) {
  const textColor = inverse ? 'text-white' : 'text-[#09090b]'
  return (
    <div className={`flex flex-col gap-2 ${textColor}`}>
      <p className="font-serif italic leading-none text-5xl md:text-[4rem]">{stat}</p>
      <p className="text-base leading-6 md:text-lg md:leading-7">{description}</p>
    </div>
  )
}

function TileButton({
  href,
  children,
  withChevron = true,
}: {
  href: string
  children: React.ReactNode
  withChevron?: boolean
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.96px] leading-4 text-[#09090b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] md:leading-5"
    >
      {children}
      {withChevron && <ChevronDoubleDownIcon className="size-5" />}
    </Link>
  )
}

/** Decorative looping infinity-style mark used in the dark "1-on-1 care" tile. */
function InfinityMark({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/home/infinileaf.png"
      alt=""
      width={72}
      height={32}
      sizes="72px"
      className={className}
    />
  )
}

export default function QuickStartTiles() {
  return (
    <section
      aria-label="At a glance"
      className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-4"
    >
      {/* Mobile shows the first two side-by-side, then the dark tile full-width below */}
      <div className="flex flex-row items-stretch gap-2 md:contents">
        <Tile
          className="bg-white"
          bgImage={{ src: '/assets/home/tile-curated.png', objectPosition: 'right top' }}
        >
          <TileText stat="20+" description="physician-curated peptide protocols" />
          <TileButton href="/#treatments">Treatments</TileButton>
        </Tile>

        <Tile
          className="bg-white"
          bgImage={{ src: '/assets/home/tile-100.png', objectPosition: 'center bottom' }}
        >
          <TileText
            stat="100%"
            description="U.S.-compounded in state-licensed 503A pharmacies"
          />
          <TileButton href="#about">About us</TileButton>
        </Tile>
      </div>

      <Tile className="tile-bg-shift">
        <TileText stat="1-on-1 care" description="with licensed providers — meet by video or message anytime" inverse />
        <div className="flex items-center justify-between gap-3">
          <TileButton href="#process">How to get started</TileButton>
          <InfinityMark className="shrink-0" />
        </div>
      </Tile>
    </section>
  )
}
