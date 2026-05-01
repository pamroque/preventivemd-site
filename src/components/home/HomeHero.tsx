import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/ui/Logo'

/** heroicons-outline/globe-alt — matches the SiteNav accessibility button */
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? 'size-6'}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.038 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.038-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  )
}

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
          sizes="100vw"
          priority
          className="object-cover object-top md:hidden"
        />
        <Image
          src="/assets/home/hero-mobile-2.png"
          alt=""
          fill
          sizes="100vw"
          className="hero-crossfade object-cover object-top md:hidden"
        />
        <Image
          src="/assets/home/hero-desktop-1.png"
          alt=""
          fill
          sizes="100vw"
          priority
          className="hidden object-cover object-top md:block"
        />
        <Image
          src="/assets/home/hero-desktop-2.png"
          alt=""
          fill
          sizes="100vw"
          className="hero-crossfade hidden object-cover object-top md:block"
        />
      </div>

      {/* Top-right accessibility utility — pinned to the corner so it stays
          aligned to the rounded top-right of the hero. */}
      <button
        type="button"
        aria-label="Language and Accessibility settings"
        className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-bl-lg bg-white pb-2 pl-2 pr-2 pt-1.5 text-[#1d2d44] transition-opacity hover:opacity-90 md:gap-1 md:pl-3 md:pr-3"
      >
        <GlobeIcon className="size-6 shrink-0" />
        <span className="hidden text-left text-[10px] font-medium leading-[1.4] text-[#1d2d44] md:block">
          Language &amp;
          <br />
          Accessibility
        </span>
      </button>

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
            <span className="block text-[36px] md:text-[54px]">Personalized care</span>
            <span className="block font-serif italic text-[42px] md:text-[64px]">
              precisely for you
            </span>
          </h1>

          <div className="flex flex-wrap items-start gap-3">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-[0.96px] leading-4 text-[#09090b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] md:leading-5"
            >
              Get started
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4e4e7] bg-transparent px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-[0.96px] leading-4 text-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:leading-5"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
