'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useAccessibilitySettings } from '@/components/a11y/AccessibilityContext'

/**
 * Subtle staggered fade-up applied to each step in the dark container.
 * Renders identical SSR markup; on hydration we observe the section and
 * flip `visible` once any of it enters the viewport.
 */
const STEP_DURATION_MS = 1100
const STEP_STAGGER_MS = 550

function stepAnimClass(visible: boolean) {
  return `transition-[opacity,transform] ease-out motion-reduce:transition-none ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
  }`
}

function stepAnimStyle(index: number, extraDelayMs = 0): React.CSSProperties {
  return {
    transitionDuration: `${STEP_DURATION_MS}ms`,
    transitionDelay: `${index * STEP_STAGGER_MS + extraDelayMs}ms`,
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
function PathCard({
  eyebrow,
  title,
  price,
  fee,
  badges,
  variant = 'default',
  glint = false,
}: {
  eyebrow: string
  title: string
  price?: string
  fee?: string
  badges: string[]
  variant?: 'default' | 'subtle'
  /** When true, applies the breathing box-shadow halo defined by `.path-card-glint`. */
  glint?: boolean
}) {
  const bgImage =
    variant === 'default'
      ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%), linear-gradient(268deg, rgb(15, 23, 42) 0%, rgb(29, 45, 68) 100%)'
      : 'linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%), linear-gradient(129deg, rgba(29, 45, 68, 0.2) 0%, rgba(15, 23, 42, 0.2) 100%)'

  return (
    <div
      className={`relative w-full rounded-[36px] border border-[rgba(228,228,231,0.5)] p-6 backdrop-blur-[2px] ${
        glint ? 'path-card-glint' : ''
      }`}
      style={{ backgroundImage: bgImage }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col justify-center gap-2 min-h-[48px]">
            <p className="text-xs font-light uppercase tracking-[1.5px] leading-4 text-white md:text-sm">
              {eyebrow}
            </p>
            <p
              className={`font-serif italic leading-[1.3] text-white ${
                variant === 'default'
                  ? 'text-[2rem] md:text-4xl'
                  : 'text-[1.75rem] md:text-[2rem]'
              }`}
            >
              {title}
            </p>
          </div>
          {price !== undefined && (
            <p className="shrink-0 text-right text-white whitespace-nowrap">
              <span className="font-light leading-none text-[1.29rem]">$</span>
              <span className="font-light leading-none text-[2rem]">{price}</span>
              <br />
              <span className="font-light leading-tight text-sm">{fee}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map((label) => {
            return (
              <span
                key={label}
                className="relative inline-flex items-center justify-center rounded-[14px] border border-[rgba(244,244,245,0.12)] bg-[rgba(244,244,245,0.08)] px-2 py-1 text-xs leading-4 text-white/70 md:text-sm md:leading-5"
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
      <span className="text-base leading-6 text-[#a1a1aa]">OR</span>
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
      <p className="text-sm font-medium uppercase leading-6 text-[#a1a1aa] md:text-base">
        {step}
      </p>
      <p className="text-2xl leading-8 tracking-[-0.6px] text-white md:text-3xl md:leading-9 md:tracking-[-0.75px]">
        {title}
      </p>
      <p className="text-base leading-6 text-[#a1a1aa]">
        {description}
      </p>
    </div>
  )
}

export default function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const { animations } = useAccessibilitySettings()

  useEffect(() => {
    if (typeof window === 'undefined') return
    // The context already folds OS-level reduce-motion into `animations`.
    if (!animations) {
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
  }, [animations])

  return (
    <section
      ref={sectionRef}
      id="process"
      aria-labelledby="process-heading"
      className="flex scroll-mt-16 flex-col items-center gap-9 md:scroll-mt-20 md:gap-12"
    >
      {/* Title */}
      <div className="flex w-full flex-col gap-1.5 text-center md:gap-3">
        <p className="text-sm font-medium leading-5 text-[#71717a] md:text-base md:leading-6">
          How to get started
        </p>
        <h2
          id="process-heading"
          className="leading-[1.1] text-[#09090b]"
        >
          <span className="font-serif italic text-[2.625rem] md:text-[4rem]">
            Personalized care{' '}
          </span>
          <span className="font-extralight text-4xl md:text-[3.375rem]">begins here</span>
        </h2>
      </div>

      {/* Dark container — stacks on mobile + tablet, three columns at lg+
          where there's enough room to give Step 2 the width it needs. */}
      <div className="flex w-full flex-col gap-12 overflow-hidden rounded-br-[48px] rounded-tl-[48px] bg-gradient-to-t from-brand-navy to-[#071024] px-6 pt-9 pb-6 md:rounded-br-[72px] md:rounded-tl-[72px] md:px-12 md:pt-9 md:pb-12 lg:flex-row">
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
            className="relative flex w-full items-center justify-center gap-3 rounded-lg border border-brand-blue bg-brand-blue px-4 py-2 text-base font-medium leading-6 text-white shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.15)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
          >
            Get started
          </Link>
        </div>

        {/* Step 2 / Middle — internal batch reveal in 4 phases:
            text headings → Concierge card → Or divider → Request card.
            Each phase rides on Step 2's base index (1 = 550ms) plus an
            additional 250ms sub-stagger so the group reads as one
            cohesive reveal without all four pieces popping at once. */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className={stepAnimClass(visible)} style={stepAnimStyle(1, 0)}>
            <StepText
              step="Step 2"
              title="Two paths, one standard of care"
              description="Medication costs are separate and not yet included in the following fees."
            />
          </div>
          <div className="flex flex-col items-center justify-center gap-6">
            <div
              className={`w-full ${stepAnimClass(visible)}`}
              style={stepAnimStyle(1, 250)}
            >
              <PathCard
                eyebrow="For a more personal touch"
                title="Meet with your concierge provider"
                price="99"
                fee="per visit"
                badges={['20-minute phone/video call', 'Bespoke care plan']}
                variant="default"
                glint
              />
            </div>
            <div
              className={`flex w-full justify-center ${stepAnimClass(visible)}`}
              style={stepAnimStyle(1, 500)}
            >
              <OrDivider />
            </div>
            <div
              className={`w-full ${stepAnimClass(visible)}`}
              style={stepAnimStyle(1, 750)}
            >
              <PathCard
                eyebrow="Already know what you want?"
                title="Request your treatment"
                badges={['Decisions in 24 hrs', 'No fee', 'Consult via chat']}
                variant="subtle"
              />
            </div>
          </div>
        </div>

        {/* Step 3 + Step 4 — right column. Both fire AFTER Step 2's final
            batch (Request card at 450 + 600 = 1050ms) so the reveal stays
            strictly sequential: Step 1 → Step 2 batches → Step 3 → Step 4.
            Explicit total delays bypass the indexed stagger since Step 2's
            sub-batches broke the original "index × 450ms" rhythm.
            The InfinityMark rides along with Step 4 so it doesn't pop in early. */}
        <div className="flex flex-col gap-12 lg:w-[300px]">
          <div className={stepAnimClass(visible)} style={stepAnimStyle(0, 1850)}>
            <StepText
              step="Step 3"
              title="Self-pay checkout"
              description="Pay one upfront price for your medication and provider consultation — no insurance billing, no surprise fees."
            />
          </div>
          <div
            className={`flex flex-col gap-12 ${stepAnimClass(visible)}`}
            style={stepAnimStyle(0, 2400)}
          >
            <StepText
              step="Step 4"
              title="Provider-approved, then delivered"
              description="A licensed provider prescribes if it's the right fit. Afterwards, message your care team anytime - it's included in your prescription plan."
            />
            <InfinityMark className="self-end" />
          </div>
        </div>
      </div>
    </section>
  )
}
