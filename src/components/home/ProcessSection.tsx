'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

/**
 * Subtle staggered fade-up applied to each step in the dark container.
 * Renders identical SSR markup; on hydration we observe the section and
 * flip `visible` once any of it enters the viewport.
 */
const STEP_DURATION_MS = 900
const STEP_STAGGER_MS = 450

function stepAnimClass(visible: boolean) {
  return `transition-[opacity,transform] ease-out motion-reduce:transition-none ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
  }`
}

function stepAnimStyle(index: number): React.CSSProperties {
  return {
    transitionDuration: `${STEP_DURATION_MS}ms`,
    transitionDelay: `${index * STEP_STAGGER_MS}ms`,
  }
}

/** Decorative looping mark used at bottom-left of Step 1. */
function InfinityMark({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/home/infinileaf.png"
      alt=""
      width={94}
      height={42}
      sizes="94px"
      className={className}
    />
  )
}

/** Pricing card for one of the two paths (Need guidance? / Know what you want?) */
type Badge = string | { label: string; shine?: boolean }

function PathCard({
  eyebrow,
  title,
  price,
  fee,
  badges,
  variant = 'default',
}: {
  eyebrow: string
  title: string
  price: string
  fee: string
  /** A badge can be a plain string or `{ label, shine }`; `shine: true`
   *  applies the looping outline animation defined by `.path-card-shine`. */
  badges: Badge[]
  variant?: 'default' | 'subtle'
}) {
  const bgImage =
    variant === 'default'
      ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%), linear-gradient(268deg, rgb(15, 23, 42) 0%, rgb(29, 45, 68) 100%)'
      : 'linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%), linear-gradient(129deg, rgba(29, 45, 68, 0.2) 0%, rgba(15, 23, 42, 0.2) 100%)'

  return (
    <div
      className="w-full rounded-[36px] border border-[rgba(228,228,231,0.5)] p-6 backdrop-blur-[2px]"
      style={{ backgroundImage: bgImage }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col justify-center gap-2 min-h-[48px]">
            <p className="text-[12px] font-light uppercase tracking-[1.5px] leading-4 text-white md:text-[14px]">
              {eyebrow}
            </p>
            <p
              className={`font-serif italic leading-[1.3] text-white ${
                variant === 'default'
                  ? 'text-[32px] md:text-[36px]'
                  : 'text-[24px] md:text-[30px]'
              }`}
            >
              {title}
            </p>
          </div>
          <p className="shrink-0 text-right text-white whitespace-nowrap">
            <span className="font-light leading-[1.1] text-[20.64px]">$</span>
            <span className="font-light leading-[1.1] text-[32px]">{price}</span>
            <br />
            <span className="font-light leading-[1.1] text-[16px]">{fee}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => {
            const label = typeof badge === 'string' ? badge : badge.label
            const shine = typeof badge !== 'string' && badge.shine
            return (
              <span
                key={label}
                className={`relative inline-flex items-center justify-center rounded-[14px] border border-[rgba(244,244,245,0.12)] bg-[rgba(244,244,245,0.08)] px-2 py-1 text-[12px] leading-4 text-white/70 md:text-[14px] md:leading-5 ${
                  shine ? 'path-card-shine' : ''
                }`}
              >
                {label}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function OrDivider() {
  return (
    <div className="flex w-full max-w-[240px] items-center gap-3" role="presentation">
      <div className="h-px flex-1 bg-white/30" />
      <span className="font-serif italic leading-5 text-[20px] text-white">OR</span>
      <div className="h-px flex-1 bg-white/30" />
    </div>
  )
}

function StepText({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-2 md:gap-4">
      <p className="text-[14px] font-medium uppercase leading-6 text-[#a1a1aa] md:text-[16px]">
        {step}
      </p>
      <p className="text-[24px] leading-8 tracking-[-0.6px] text-white md:text-[30px] md:leading-9 md:tracking-[-0.75px]">
        {title}
      </p>
      <p className="text-[14px] leading-5 text-[#a1a1aa] md:text-[16px] md:leading-6">
        {description}
      </p>
    </div>
  )
}

export default function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="process"
      aria-labelledby="process-heading"
      className="flex scroll-mt-16 flex-col items-center gap-9 md:scroll-mt-20 md:gap-12"
    >
      {/* Title */}
      <div className="flex w-full flex-col gap-1.5 text-center md:gap-3">
        <p className="text-[14px] font-medium leading-5 text-[#71717a] md:text-[16px] md:leading-6">
          How to get started
        </p>
        <h2
          id="process-heading"
          className="leading-[1.1] text-[#09090b]"
        >
          <span className="font-serif italic text-[42px] md:text-[64px]">
            Personalized care{' '}
          </span>
          <span className="font-extralight text-[36px] md:text-[54px]">begins here</span>
        </h2>
      </div>

      {/* Dark container — stacks on mobile + tablet, three columns at lg+
          where there's enough room to give Step 2 the width it needs. */}
      <div className="flex w-full flex-col gap-12 overflow-hidden rounded-br-[48px] rounded-tl-[48px] bg-gradient-to-t from-[#1d2d44] to-[#071024] px-6 pt-9 pb-6 md:rounded-br-[72px] md:rounded-tl-[72px] md:px-12 md:pt-9 md:pb-12 lg:flex-row">
        {/* Step 1 — left column. CTA sits directly below the step copy. */}
        <div
          className={`flex flex-col gap-6 lg:w-[300px] ${stepAnimClass(visible)}`}
          style={stepAnimStyle(0)}
        >
          <StepText
            step="Step 1"
            title="A few questions to get to know you"
            description="Complete a 5-minute medical questionnaire about your goals and health, so that your provider can prescribe with you in mind."
          />
          <Link
            href="/get-started"
            className="relative flex w-full items-center justify-center gap-3 rounded-lg border border-[#3A5190] bg-[#3A5190] px-4 py-2 text-[16px] font-medium leading-6 text-white shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.15)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2d44]"
          >
            Get started
          </Link>
        </div>

        {/* Step 2 / Middle */}
        <div
          className={`flex min-w-0 flex-1 flex-col gap-6 ${stepAnimClass(visible)}`}
          style={stepAnimStyle(1)}
        >
          <StepText
            step="Step 2"
            title="Two ways in, one standard of care"
            description="Medication costs are separate and not yet included in the following fees."
          />
          <div className="flex flex-col items-center justify-center gap-6">
            <PathCard
              eyebrow="Need guidance?"
              title="Meet with your dedicated provider"
              price="35"
              fee="fee"
              badges={[
                '20-minute video call',
                { label: 'Highly personalized', shine: true },
              ]}
              variant="default"
            />
            <OrDivider />
            <PathCard
              eyebrow="Know what you want?"
              title="Request your treatment"
              price="0"
              fee="fee"
              badges={['Decisions in 24 hours', 'No scheduling']}
              variant="subtle"
            />
          </div>
        </div>

        {/* Step 3 + Step 4 — right column. Each gets its own stagger; the
            InfinityMark rides along with Step 4 so it doesn't pop in early. */}
        <div className="flex flex-col gap-12 lg:w-[300px]">
          <div className={stepAnimClass(visible)} style={stepAnimStyle(2)}>
            <StepText
              step="Step 3"
              title="Self-pay checkout"
              description="Pay one upfront price for your medication and provider consultation — no insurance billing, no surprise fees."
            />
          </div>
          <div
            className={`flex flex-col gap-12 ${stepAnimClass(visible)}`}
            style={stepAnimStyle(3)}
          >
            <StepText
              step="Step 4"
              title="Provider-approved, then delivered"
              description="A licensed provider prescribes if it's the right fit. Afterwards, message your care team anytime — included with your prescription plan."
            />
            <InfinityMark className="self-end" />
          </div>
        </div>
      </div>
    </section>
  )
}
