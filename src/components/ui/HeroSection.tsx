'use client'

/*
 * HeroSection.tsx — Full-screen hero with background image
 *
 * KEY CONCEPT: Why 'use client' here?
 * The hero has an image load animation (scale effect when the bg
 * image finishes loading). That requires useEffect + useState to
 * detect the image load event — browser-only APIs.
 *
 * In your old HTML, this was done with vanilla JS:
 *   const img = new Image();
 *   img.onload = () => heroBg.classList.add('loaded');
 *
 * In React, we use useEffect for the same thing, but it's cleaner
 * because the logic lives WITH the component it affects.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1920&q=85'

export function HeroSection() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setLoaded(true)
    img.src = HERO_IMAGE
  }, [])

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image with scale animation */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-transform duration-[8s] ease-out ${
          loaded ? 'scale-100' : 'scale-[1.03]'
        }`}
        style={{ backgroundImage: `url('${HERO_IMAGE}')`, backgroundPosition: 'center 30%' }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, rgba(13,22,40,0.88) 0%, rgba(13,22,40,0.72) 50%, rgba(13,22,40,0.25) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[680px] px-8 md:px-[72px] pt-[120px] pb-20">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 text-[0.73rem] font-medium tracking-[1.5px] uppercase text-teal-brand mb-7">
          <span className="block w-7 h-px bg-teal-brand" />
          Physician-Led Peptide Therapy
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(2.6rem,5.5vw,4.4rem)] font-extralight leading-[1.1] tracking-tight text-white mb-5">
          Look better.
          <br />
          Feel <span className="gradient-text">stronger.</span>
          <br />
          Live longer.
        </h1>

        <p className="text-[1.05rem] font-light text-white/75 leading-relaxed max-w-[560px] mb-9">
          Two ways to start — pick the path that makes sense for you.
        </p>

        {/* Two pathway cards */}
        <div className="flex flex-col sm:flex-row gap-3 mb-7 max-w-[560px]">
          {/* Async path */}
          <Link
            href="#protocols"
            className="flex-1 p-[18px_20px] rounded-[14px] no-underline transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)] bg-[rgba(0,180,200,0.12)] border border-[rgba(0,180,200,0.3)] flex flex-col gap-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-teal-brand to-[#00d4aa]">
                <svg className="w-[15px] h-[15px] stroke-white stroke-2 fill-none" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
              </div>
              <div className="text-[0.92rem] font-semibold text-white leading-tight">
                Choose Your Medication
              </div>
            </div>
            <div className="text-[0.72rem] font-semibold tracking-wide text-teal-brand">
              $0 — No consult fee
            </div>
            <div className="text-[0.78rem] font-light text-white/60 leading-relaxed">
              Know which treatment you want? Complete its medical assessment — a
              physician reviews your case and can approve your medication within
              24 hours.
            </div>
          </Link>

          {/* Sync path */}
          <Link
            href="/get-started"
            className="flex-1 p-[18px_20px] rounded-[14px] no-underline transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)] bg-[rgba(0,113,188,0.10)] border border-[rgba(0,113,188,0.25)] flex flex-col gap-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 bg-brand-gradient">
                <svg className="w-[15px] h-[15px] stroke-white stroke-2 fill-none" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
                </svg>
              </div>
              <div className="text-[0.92rem] font-semibold text-white leading-tight">
                Ask a Provider
              </div>
            </div>
            <div className="text-[0.72rem] font-semibold tracking-wide text-[#5eb8ff]">
              $35 — 20-minute video visit
            </div>
            <div className="text-[0.78rem] font-light text-white/60 leading-relaxed">
              Not sure what&apos;s right for you? A physician will recommend the
              right protocol based on your goals.
            </div>
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[0.68rem] tracking-wider uppercase text-white/40 z-10">
        Scroll
        <span className="block w-px h-10 bg-white/25" />
      </div>
    </section>
  )
}
