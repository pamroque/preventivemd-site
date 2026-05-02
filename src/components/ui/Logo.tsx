import type { CSSProperties } from 'react'
import LogoFull from '@public/assets/logo-full.svg'
import LogoGlyph from '@public/assets/logo-glyph.svg'

type LogoProps = {
  className?: string
  /** Visually-hidden label override. Falls back to "PreventiveMD". */
  title?: string
  /**
   * `full` (default): wordmark + symbol — used on hero, footer, top navbars.
   * `glyph`: just the looping symbol — used on the BackHeader navbar where
   * space is tight and the wordmark would compete with the Back button.
   */
  variant?: 'full' | 'glyph'
  /**
   * `brand` (default): two-color mark using the brand palette.
   * `inverse`: every glyph inherits `currentColor`, so a parent class like
   * `text-white` themes the whole mark. Use on dark backgrounds (hero,
   * footer) where the brand colors would lose contrast.
   *
   * Implementation: `next.config.js` swaps the baked `#3A5190` and `#1D2D44`
   * fills for `var(--logo-blue, #3A5190)` and `var(--logo-navy, #1D2D44)`.
   * Inverse tone overrides both vars to `currentColor` here.
   */
  tone?: 'brand' | 'inverse'
}

const inverseStyle = {
  '--logo-blue': 'currentColor',
  '--logo-navy': 'currentColor',
} as CSSProperties

/**
 * PreventiveMD wordmark. Source of truth lives in `public/assets/logo-*.svg`;
 * SVGR inlines them at build time so CSS-driven theming still works.
 */
export default function Logo({
  className,
  title = 'PreventiveMD',
  variant = 'full',
  tone = 'brand',
}: LogoProps) {
  const Component = variant === 'glyph' ? LogoGlyph : LogoFull
  return (
    <Component
      role="img"
      aria-label={title}
      title={title}
      className={className}
      style={tone === 'inverse' ? inverseStyle : undefined}
    />
  )
}
