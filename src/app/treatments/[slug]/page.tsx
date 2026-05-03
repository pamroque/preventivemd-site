import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { treatmentContent, getAllTreatmentSlugs } from '@/lib/treatment-content'
import { getOfferedFormOptionsBySlug } from '@/lib/treatment-forms'
import TreatmentAudioButton from '@/components/home/TreatmentAudioButton'
import EveGreeting from '@/components/get-started/EveGreeting'
import GetStartedBlock from '@/components/get-started/GetStartedBlock'
import HomeFooter from '@/components/home/HomeFooter'
import BmiCalculator from '@/components/treatments/BmiCalculator'

// Pre-render every treatment as static HTML at build time.
export function generateStaticParams() {
  return getAllTreatmentSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const t = treatmentContent[slug]
  if (!t) return { title: 'Treatment Not Found' }
  const fullName = `${t.name}${t.trademark ?? ''}`
  return {
    title:       `${fullName} – PreventiveMD`,
    description: t.summary.replace(/\[TODO:[^\]]*\]/g, '').trim() || `Learn about ${fullName} at PreventiveMD.`,
  }
}

// ─── Layout primitives ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-[1.5px] uppercase text-brand-blue">
      {children}
    </p>
  )
}

function SectionHeading({
  id,
  children,
}: {
  id?:      string
  children: React.ReactNode
}) {
  return (
    <h2
      id={id}
      className="font-serif italic leading-[1.15] text-[clamp(1.75rem,3.5vw,2.25rem)] text-[#09090b]"
    >
      {children}
    </h2>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? 'size-5'}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a.75.75 0 0 1 .006 1.06l-7.5 7.625a.75.75 0 0 1-1.07 0L4.29 10.105a.75.75 0 0 1 1.07-1.05l3.31 3.358 6.974-7.108a.75.75 0 0 1 1.06-.015Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function MinusCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? 'size-5'}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? 'size-8'}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function TimelineDot() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="5" stroke="rgb(var(--brand-blue-rgb))" strokeWidth="2" />
    </svg>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function TreatmentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const t = treatmentContent[slug]
  if (!t) notFound()

  const fullName = `${t.name}${t.trademark ?? ''}`
  const offered  = getOfferedFormOptionsBySlug(slug)

  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className="bg-white focus:outline-none"
      >
        {/* ── Breadcrumb ── */}
        <nav
          aria-label="Breadcrumb"
          className="px-4 pt-16 md:px-12 md:pt-20"
        >
          <ol className="mx-auto flex max-w-[1080px] items-center gap-2 text-xs leading-4 text-[#71717a]">
            <li>
              <Link href="/" className="hover:text-brand-navy transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#a1a1aa]">/</li>
            <li>
              <Link href="/#treatments" className="hover:text-brand-navy transition-colors">
                Treatments
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#a1a1aa]">/</li>
            <li aria-current="page" className="font-medium text-brand-navy">
              {fullName}
            </li>
          </ol>
        </nav>

        {/* ── Hero ── */}
        <section
          aria-labelledby="hero-heading"
          className="px-4 pt-6 pb-12 md:px-12 md:pt-9 md:pb-16"
        >
          <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-12">
            {/* Photo */}
            <div className="relative flex h-[300px] items-center justify-center overflow-hidden rounded-[36px] bg-brand-cream md:h-[420px] md:rounded-[48px]">
              <div className="relative size-[180px] md:size-[240px]">
                <Image
                  src={t.thumbnail}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 240px, 180px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Name + audio + price + summary */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <h1
                    id="hero-heading"
                    className="font-serif italic leading-[1.05] text-[clamp(2.5rem,6vw,4rem)] text-[#09090b]"
                  >
                    {t.name}
                    {t.trademark && (
                      <span className="text-[0.65em] align-baseline ml-0.5">
                        {t.trademark}
                      </span>
                    )}
                  </h1>
                  <TreatmentAudioButton name={t.name} audioSrc={t.audioSrc} />
                </div>
                <p className="text-base font-bold leading-6 text-[#09090b]">
                  Starting at ${t.startingAtPerMo}/mo
                </p>
              </div>

              <p className="text-base leading-7 text-[#09090b] md:text-lg md:leading-8">
                {t.summary}
              </p>
            </div>
          </div>
        </section>

        {/* ── Overview video ── */}
        <section
          aria-labelledby="video-heading"
          className="px-4 pb-16 md:px-12"
        >
          <div className="mx-auto max-w-[1080px]">
            <div className="flex flex-col gap-3">
              <SectionLabel>{t.video.lengthMin}-min overview</SectionLabel>
              <SectionHeading id="video-heading">
                Watch a quick intro to {fullName}
              </SectionHeading>
            </div>

            {/* Placeholder card. Replace with a real player when video URLs land. */}
            <div className="mt-6 aspect-video w-full overflow-hidden rounded-[24px] bg-brand-navy md:rounded-[36px]">
              <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-navy to-[#0f172a]">
                <button
                  type="button"
                  className="flex size-16 items-center justify-center rounded-full bg-white/10 text-white shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy md:size-20"
                  aria-label={`Play ${t.video.lengthMin}-minute overview of ${fullName}`}
                  disabled
                >
                  <PlayIcon className="size-7 md:size-8" />
                </button>
                <p className="absolute bottom-4 right-4 text-xs uppercase tracking-[1.5px] text-white/60">
                  Video coming soon
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── What is it? + benefits ── */}
        <section
          aria-labelledby="whatisit-heading"
          className="px-4 pb-16 md:px-12 md:pb-24"
        >
          <div className="mx-auto flex max-w-[840px] flex-col gap-6">
            <div className="flex flex-col gap-3">
              <SectionLabel>What is it</SectionLabel>
              <SectionHeading id="whatisit-heading">
                Understanding {fullName}
              </SectionHeading>
            </div>

            <div className="flex flex-col gap-4 text-base leading-7 text-[#09090b]">
              {t.whatIsIt.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {t.whatIsIt.benefits.length > 0 && (
              <div className="flex flex-col gap-3 rounded-[24px] border border-[#e4e4e7] bg-brand-cream/40 p-6 md:p-8">
                <p className="text-sm font-medium leading-5 text-[#09090b]">
                  Common reasons patients consider it
                </p>
                <ul className="flex flex-col gap-3">
                  {t.whatIsIt.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 size-5 shrink-0 text-brand-blue" />
                      <span className="text-base leading-6 text-[#09090b]">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ── How it works (MOA) ── */}
        <section
          aria-labelledby="howitworks-heading"
          className="bg-brand-cream/50 px-4 py-16 md:px-12 md:py-24"
        >
          <div className="mx-auto flex max-w-[840px] flex-col gap-6">
            <div className="flex flex-col gap-3">
              <SectionLabel>How it works</SectionLabel>
              <SectionHeading id="howitworks-heading">
                Mechanism of action
              </SectionHeading>
            </div>

            <div className="flex flex-col gap-4 text-base leading-7 text-[#09090b]">
              {t.howItWorks.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {t.howItWorks.steps && t.howItWorks.steps.length > 0 && (
              <ol className="mt-2 flex flex-col gap-4">
                {t.howItWorks.steps.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-4 rounded-2xl border border-[#e4e4e7] bg-white p-5"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-medium leading-5 text-white">
                      {i + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-medium leading-6 text-[#09090b]">
                        {s.title}
                      </p>
                      <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                        {s.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* ── Research / results ── */}
        <section
          aria-labelledby="research-heading"
          className="px-4 py-16 md:px-12 md:py-24"
        >
          <div className="mx-auto flex max-w-[840px] flex-col gap-6">
            <div className="flex flex-col gap-3">
              <SectionLabel>Research</SectionLabel>
              <SectionHeading id="research-heading">
                What the studies show
              </SectionHeading>
            </div>

            <div className="flex flex-col gap-4 text-base leading-7 text-[#09090b]">
              {t.research.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {t.research.stats.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {t.research.stats.map((s, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 rounded-2xl border border-[#e4e4e7] bg-white p-5"
                  >
                    <p className="font-serif italic text-3xl leading-[1.1] text-brand-blue">
                      {s.value}
                    </p>
                    <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Who is it for? + Who is NOT for ── */}
        <section
          aria-labelledby="audience-heading"
          className="bg-brand-cream/50 px-4 py-16 md:px-12 md:py-24"
        >
          <div className="mx-auto flex max-w-[840px] flex-col gap-9">
            <div className="flex flex-col gap-3">
              <SectionLabel>Eligibility</SectionLabel>
              <SectionHeading id="audience-heading">
                Who {fullName} is for
              </SectionHeading>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-2xl border border-[#e4e4e7] bg-white p-6">
                <p className="text-sm font-medium leading-5 text-brand-teal">
                  Generally a good fit for
                </p>
                <ul className="flex flex-col gap-3">
                  {t.forWhom.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 size-5 shrink-0 text-brand-teal" />
                      <span className="text-base leading-6 text-[#09090b]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl border border-[#e4e4e7] bg-white p-6">
                <p className="text-sm font-medium leading-5 text-[#b91c1c]">
                  Not appropriate for
                </p>
                <ul className="flex flex-col gap-3">
                  {t.notForWhom.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <MinusCircleIcon className="mt-0.5 size-5 shrink-0 text-[#b91c1c]" />
                      <span className="text-base leading-6 text-[#09090b]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {t.showBmiCalculator && <BmiCalculator />}
          </div>
        </section>

        {/* ── What to expect (effects journey) ── */}
        <section
          aria-labelledby="expectations-heading"
          className="px-4 py-16 md:px-12 md:py-24"
        >
          <div className="mx-auto flex max-w-[840px] flex-col gap-6">
            <div className="flex flex-col gap-3">
              <SectionLabel>What to expect</SectionLabel>
              <SectionHeading id="expectations-heading">
                Your effects journey
              </SectionHeading>
            </div>

            <ol className="flex flex-col">
              {t.expectations.map((phase, i) => {
                const isLast = i === t.expectations.length - 1
                return (
                  <li key={i} className="flex gap-4">
                    <div className="flex flex-col items-center pt-1">
                      <TimelineDot />
                      {!isLast && (
                        <div
                          className="mt-1 w-0.5 flex-1 bg-[rgba(58,81,144,0.25)]"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 pb-8">
                      <p className="text-sm font-medium uppercase tracking-[1.5px] leading-5 text-brand-blue">
                        {phase.window}
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {phase.effects.map((e, ei) => (
                          <li key={ei} className="text-base leading-6 text-[#09090b]">
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        {/* ── Side effects & safety ── */}
        <section
          aria-labelledby="safety-heading"
          className="bg-brand-cream/50 px-4 py-16 md:px-12 md:py-24"
        >
          <div className="mx-auto flex max-w-[840px] flex-col gap-6">
            <div className="flex flex-col gap-3">
              <SectionLabel>Safety</SectionLabel>
              <SectionHeading id="safety-heading">
                Side effects &amp; important safety information
              </SectionHeading>
            </div>

            <p className="text-base leading-7 text-[#09090b]">{t.safety.intro}</p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-2xl border border-[#e4e4e7] bg-white p-6">
                <p className="text-sm font-medium leading-5 text-[#09090b]">Common</p>
                <ul className="flex flex-col gap-2">
                  {t.safety.common.map((c, i) => (
                    <li key={i} className="text-base leading-6 text-[rgba(0,0,0,0.7)]">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-[#e4e4e7] bg-white p-6">
                <p className="text-sm font-medium leading-5 text-[#b91c1c]">
                  Less common but serious
                </p>
                <ul className="flex flex-col gap-2">
                  {t.safety.serious.map((c, i) => (
                    <li key={i} className="text-base leading-6 text-[rgba(0,0,0,0.7)]">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
              {t.safety.callToAction
                ?? `Tell your provider if you experience any of the above. If you have questions about whether ${fullName} is right for you, your provider will review your full health history during the intake.`}
            </p>
          </div>
        </section>

        {/* ── How is it typically taken (form factors) ── */}
        <section
          aria-labelledby="forms-heading"
          className="px-4 py-16 md:px-12 md:py-24"
        >
          <div className="mx-auto flex max-w-[840px] flex-col gap-6">
            <div className="flex flex-col gap-3">
              <SectionLabel>How it&rsquo;s typically taken</SectionLabel>
              <SectionHeading id="forms-heading">
                Form factors
              </SectionHeading>
            </div>

            <ul className="flex flex-col gap-4">
              {offered.map((f) => {
                const guidance = t.formGuidance?.[f.id]
                return (
                  <li
                    key={f.id}
                    className="flex flex-col gap-5 rounded-2xl border-2 border-brand-blue bg-white p-6 md:p-8"
                  >
                    <div className="flex items-start gap-3">
                      <CheckIcon className="mt-0.5 size-5 shrink-0 text-brand-blue" />
                      <div className="flex flex-col gap-1">
                        <p className="text-base font-medium leading-6 text-[#09090b]">
                          {f.label}
                        </p>
                        {f.sub && (
                          <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">{f.sub}</p>
                        )}
                      </div>
                    </div>

                    {guidance && (
                      <div className="flex flex-col gap-5 border-t border-[#e4e4e7] pt-5">
                        <div className="flex flex-col gap-1.5">
                          <p className="text-xs font-medium tracking-[1.5px] uppercase leading-4 text-brand-blue">
                            Typical dosage
                          </p>
                          <p className="text-base leading-6 text-[#09090b]">
                            {guidance.dosage}
                          </p>
                        </div>

                        {guidance.howTo.length > 0 && (
                          <div className="flex flex-col gap-2.5">
                            <p className="text-xs font-medium tracking-[1.5px] uppercase leading-4 text-brand-blue">
                              How to use
                            </p>
                            <ol className="flex flex-col gap-2.5">
                              {guidance.howTo.map((step, i) => (
                                <li key={i} className="flex items-start gap-3">
                                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-medium leading-4 text-white">
                                    {i + 1}
                                  </span>
                                  <span className="text-base leading-6 text-[#09090b]">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* ── FAQs ── */}
        {t.faqs && t.faqs.length > 0 && (
          <section
            aria-labelledby="faqs-heading"
            className="px-4 py-16 md:px-12 md:py-24"
          >
            <div className="mx-auto flex max-w-[840px] flex-col gap-6">
              <div className="flex flex-col gap-3">
                <SectionLabel>FAQs</SectionLabel>
                <SectionHeading id="faqs-heading">
                  Frequently asked questions
                </SectionHeading>
              </div>

              <div className="flex flex-col gap-3">
                {t.faqs.map((f, i) => (
                  <details
                    key={i}
                    className="group rounded-2xl border border-[#e4e4e7] bg-white p-5 [&[open]>summary>svg]:rotate-180"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium leading-6 text-[#09090b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 rounded-md">
                      <span>{f.q}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="size-5 shrink-0 text-brand-blue transition-transform"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </summary>
                    <p className="mt-3 text-base leading-7 text-[rgba(0,0,0,0.7)]">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── How to get started (Eve greeting + shared block) ── */}
        <section
          aria-labelledby="get-started-heading"
          className="bg-brand-cream/50 px-4 py-16 md:px-12 md:py-24"
        >
          <div className="mx-auto flex max-w-[560px] flex-col gap-9 md:gap-12">
            <EveGreeting headingLevel="h2" headingId="get-started-heading" />
            <GetStartedBlock peptide={t.slug} />
          </div>
        </section>
      </main>

      <HomeFooter />
    </>
  )
}
