import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { treatmentDetails, getAllTreatmentSlugs } from '@/lib/treatment-data'
import { FAQAccordion } from '@/components/treatments/FAQAccordion'

/*
 * DYNAMIC TREATMENT PAGE — src/app/treatments/[slug]/page.tsx
 *
 * KEY CONCEPT: Dynamic routes with [slug]
 *
 * The square brackets in the folder name mean this is a dynamic segment.
 * When someone visits /treatments/semaglutide, Next.js passes
 * { slug: 'semaglutide' } as the params prop.
 *
 * ONE component file → ALL treatment pages. The data comes from
 * treatment-data.ts. This is the power of separating content from layout.
 *
 * KEY CONCEPT: generateStaticParams
 * This function tells Next.js at BUILD TIME which slugs exist,
 * so it can pre-render all treatment pages as static HTML files.
 * This is called SSG (Static Site Generation) — your pages load
 * instantly because they're pre-built HTML, not server-rendered
 * on every request.
 *
 * KEY CONCEPT: generateMetadata
 * Dynamic SEO. Each treatment page gets its own <title> and
 * <meta description> generated from the data.
 */

// Pre-render all treatment pages at build time (SSG)
export function generateStaticParams() {
  return getAllTreatmentSlugs().map((slug) => ({ slug }))
}

// Dynamic SEO metadata per treatment
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const treatment = treatmentDetails[slug]
  if (!treatment) return { title: 'Treatment Not Found' }

  return {
    title: `${treatment.highlight} – ${treatment.category}`,
    description: treatment.metaDescription,
  }
}

export default async function TreatmentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const t = treatmentDetails[slug]

  // If slug doesn't match any treatment, show 404
  if (!t) notFound()

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      {/* BREADCRUMB — also acts as the "back to Welcome" path */}
      <nav
        aria-label="Breadcrumb"
        className="px-6 pb-2 pt-20 md:px-12 md:pt-24"
      >
        <ol className="mx-auto flex max-w-[1080px] items-center gap-2 text-xs text-muted">
          <li>
            <Link
              href="/"
              className="transition-colors hover:text-navy"
            >
              Welcome
            </Link>
          </li>
          <li aria-hidden="true" className="text-muted/60">/</li>
          <li>
            <Link
              href="/#treatments"
              className="transition-colors hover:text-navy"
            >
              Treatments
            </Link>
          </li>
          <li aria-hidden="true" className="text-muted/60">/</li>
          <li aria-current="page" className="font-medium text-navy">
            {t.highlight}
          </li>
        </ol>
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-b from-bg to-white pt-6 pb-14 px-6 md:px-12">
        <div className="max-w-[1080px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            {/* Category badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-5 border"
              style={{
                color: t.categoryColor,
                borderColor: `${t.categoryColor}22`,
                background: `${t.categoryColor}08`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: `linear-gradient(135deg, ${t.categoryColor}, var(--teal))` }}
              />
              {t.category}
            </div>

            <h1 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extralight tracking-tight text-navy leading-[1.15] mb-4">
              {t.title}{' '}
              <strong className="font-semibold gradient-text">{t.highlight}</strong>
            </h1>

            <p className="text-[0.95rem] text-muted font-light leading-relaxed max-w-[520px] mb-8">
              {t.subtitle}
            </p>

            {/* Hero stats */}
            <div className="flex gap-6 mb-8">
              {t.heroStats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-extralight gradient-text">{stat.value}</div>
                  <div className="text-[0.7rem] text-muted font-light mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <Link
              href={`/get-started?peptide=${encodeURIComponent(t.highlight)}`}
              className="btn-primary"
            >
              Start Your Assessment &rarr;
            </Link>
            <p className="text-xs text-muted font-light mt-3">
              5-minute intake &middot; Physician reviews within 24 hours &middot; No insurance needed
            </p>
          </div>

          {/* Image placeholder */}
          <div className="h-[400px] rounded-2xl bg-gradient-to-br from-[#1d3557] to-[#264f78] flex items-center justify-center">
            <div className="text-center text-white/50">
              <div className="text-5xl mb-3">💊</div>
              <div className="text-xs font-semibold tracking-wider uppercase">
                Product Photography
              </div>
              <div className="text-xs font-light mt-1">Coming Soon</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="max-w-[900px] mx-auto">
          <div className="section-label">How It Works</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            {t.howItWorks.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 rounded-full bg-brand-gradient text-white text-sm font-semibold flex items-center justify-center mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="text-sm font-semibold text-navy mb-2">{step.title}</h3>
                <p className="text-xs text-muted font-light leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 px-6 md:px-12 bg-bg">
        <div className="max-w-[900px] mx-auto">
          <div className="section-label">How {t.highlight} Works</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            {t.benefits.map((benefit, i) => (
              <div
                key={i}
                className="bg-white border border-border rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="text-2xl mb-3">{benefit.icon}</div>
                <h3 className="text-sm font-semibold text-navy mb-2">{benefit.title}</h3>
                <p className="text-xs text-muted font-light leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROTOCOL TIMELINE */}
      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="max-w-[900px] mx-auto">
          <div className="section-label">Your Protocol</div>
          <div className="space-y-0 mt-8">
            {t.protocol.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-brand-gradient shrink-0 mt-1" />
                  {i < t.protocol.length - 1 && (
                    <div className="w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="pb-8">
                  <h3 className="text-sm font-semibold text-navy">{step.title}</h3>
                  <p className="text-xs text-muted font-light leading-relaxed mt-1">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 md:px-12 bg-bg">
        <div className="max-w-[700px] mx-auto">
          <div className="section-label">Frequently Asked Questions</div>
          <div className="mt-8">
            <FAQAccordion faqs={t.faqs} />
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-16 px-6 md:px-12 bg-navy text-center">
        <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-extralight text-white mb-4">
          Ready to take the <strong className="font-semibold gradient-text">next step?</strong>
        </h2>
        <p className="text-sm text-white/50 font-light mb-8 max-w-md mx-auto">
          Complete a 5-minute intake and a physician will review your case within 24 hours.
        </p>
        <Link
          href={`/get-started?peptide=${encodeURIComponent(t.highlight)}`}
          className="btn-primary text-lg"
        >
          Start Your Assessment &rarr;
        </Link>
        <div className="mt-4 text-white/30 text-xs">
          {t.price} / mo &middot; No insurance needed &middot; Cancel anytime
        </div>
      </section>
    </main>
  )
}
