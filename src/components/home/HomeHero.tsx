import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/ui/Logo'
import AccessibilityMenu from '@/components/a11y/AccessibilityMenu'

export default function HomeHero() {
  return (
    <section
      id="home-hero"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden rounded-br-[48px] rounded-tl-[48px] md:rounded-br-[72px] md:rounded-tl-[72px]"
    >
      {/* Background image — gradient is baked into each asset, so no CSS overlay.
          Two stacked images per breakpoint; the "-2" overlay crossfades on top
          of "-1" on a long, looping cycle. */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <Image
          src="/assets/home/hero-mobile-1.png"
          alt=""
          fill
          sizes="(min-width: 768px) 0px, calc(100vw - 16px)"
          priority
          className="object-cover object-top md:hidden"
        />
        <Image
          src="/assets/home/hero-mobile-2.png"
          alt=""
          fill
          sizes="(min-width: 768px) 0px, calc(100vw - 16px)"
          className="hero-crossfade object-cover object-top md:hidden"
        />
        <Image
          src="/assets/home/hero-mobile-3.png"
          alt=""
          fill
          sizes="(min-width: 768px) 0px, calc(100vw - 16px)"
          className="hero-crossfade-3 object-cover object-top md:hidden"
        />
        <Image
          src="/assets/home/hero-desktop-1.png"
          alt=""
          fill
          sizes="(min-width: 768px) calc(100vw - 32px), 0px"
          priority
          className="hidden object-cover object-top md:block"
        />
        <Image
          src="/assets/home/hero-desktop-2.png"
          alt=""
          fill
          sizes="(min-width: 768px) calc(100vw - 32px), 0px"
          className="hero-crossfade hidden object-cover object-top md:block"
        />
        <Image
          src="/assets/home/hero-desktop-3.png"
          alt=""
          fill
          sizes="(min-width: 768px) calc(100vw - 32px), 0px"
          className="hero-crossfade-3 hidden object-cover object-top md:block"
        />
      </div>

      {/* Top-right accessibility utility — pinned to the corner so it stays
          aligned to the rounded top-right of the hero. */}
      <AccessibilityMenu
        align="right"
        compact
        wrapperClassName="absolute right-0 top-0 z-10"
        triggerClassName="flex items-center gap-1 rounded-bl-lg bg-white pb-2 pl-2 pr-2 pt-1.5 text-[#1d2d44] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] md:gap-1 md:pl-3 md:pr-3"
      />

      {/* Content — logo top-left, headline + buttons bottom-left.
          justify-between mirrors the Figma hero layout.
          `id="main-content"` lives here (not on <main>) so the skip link and
          RouteFocus land *past* the Language & Accessibility utility button
          above; the next Tab goes straight to the primary "Get started" CTA. */}
      <div
        id="main-content"
        tabIndex={-1}
        className="relative flex min-h-[420px] flex-col justify-between gap-[120px] px-8 pb-8 pt-6 focus:outline-none md:min-h-[480px] md:gap-[160px] md:px-12 md:pb-12 md:pt-9"
      >
        {/* Decorative brand mark — already on `/`, so we keep it out of the
            tab order. SiteNav exposes a logo Link with role=link for keyboard
            users who need to navigate home from elsewhere. */}
        <Link
          href="/"
          aria-label="PreventiveMD home"
          tabIndex={-1}
          className="block w-fit text-white"
        >
          <Logo tone="inverse" className="h-5 w-auto md:h-6" />
        </Link>

        <div className="flex max-w-[640px] flex-col gap-6 md:gap-9">
          <h1
            id="hero-heading"
            className="font-extralight leading-[1.1] text-white"
          >
            <span className="block text-4xl md:text-[3.375rem]">Personalized care</span>
            <span className="block font-serif italic text-[2.625rem] md:text-[4rem]">
              precisely for you
            </span>
          </h1>

          <div className="flex flex-wrap items-start gap-3">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.96px] leading-4 text-[#09090b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] md:leading-5"
            >
              Get started
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4e4e7] bg-transparent px-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.96px] leading-4 text-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:leading-5"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
