import type { Metadata } from 'next'
import Link from 'next/link'
import { protocols, filterCategories } from '@/lib/protocols'

/*
 * TREATMENTS INDEX — src/app/treatments/page.tsx
 *
 * This is the route for /treatments (no slug).
 * Shows all treatments in a grid. We reuse the same protocol data
 * from the homepage, but with a simpler layout.
 */

export const metadata: Metadata = {
  title: 'All Treatments',
  description:
    'Browse all physician-prescribed peptide therapies — weight loss, longevity, healing, and more.',
}

export default function TreatmentsPage() {
  return (
    <main id="main-content" tabIndex={-1} className="pt-24 pb-20 px-6 md:px-12 focus:outline-none">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="section-label justify-center">Our Protocols</div>
          <h1 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extralight tracking-tight text-navy">
            All Treatments
          </h1>
          <p className="text-sm text-muted font-light leading-relaxed mt-3 max-w-xl mx-auto">
            Physician-prescribed peptide therapies for metabolic health,
            longevity, healing, and performance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {protocols.map((card) => (
            <Link
              key={card.slug}
              href={card.hasDetailPage ? `/treatments/${card.slug}` : '/waitlist'}
              className="bg-white border border-border rounded-2xl p-5 flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all no-underline group"
            >
              <div className="flex flex-wrap gap-1.5 mb-3">
                {card.badges.map((b, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 rounded-full text-[0.65rem] font-semibold border"
                    style={{ backgroundColor: b.bg, color: b.text, borderColor: b.border }}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
              <h3 className="text-base font-semibold text-navy group-hover:text-blue-brand transition-colors">
                {card.name}
              </h3>
              <div className="text-xs text-muted font-light mt-0.5">{card.also}</div>
              <p className="text-[0.82rem] text-muted font-light leading-relaxed mt-3 flex-1">
                {card.desc}
              </p>
              <div className="mt-5 pt-4 border-t border-border">
                <div className="text-[0.65rem] text-muted font-light uppercase tracking-wider">
                  Starting from
                </div>
                <div className="text-lg font-semibold text-navy">{card.price}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
