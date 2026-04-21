import Link from 'next/link'

/*
 * CTASection.tsx — "Your biology is unique" CTA with two pathway cards
 *
 * Server Component — static content, no interactivity needed.
 */

export function CTASection() {
  return (
    <section className="py-20 px-6 md:px-12 text-center">
      <div className="section-label justify-center">Get Started</div>
      <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extralight tracking-tight text-navy max-w-2xl mx-auto">
        Your biology is unique. Your protocol should be too.
      </h2>
      <p className="text-sm text-muted font-light leading-relaxed mt-3 max-w-xl mx-auto">
        The right peptide can change how you feel, perform, and recover — and
        getting started takes less than five minutes.
      </p>

      {/* Two-column CTA cards */}
      <div className="max-w-3xl mx-auto mt-10 rounded-2xl overflow-hidden bg-navy grid grid-cols-1 md:grid-cols-2">
        {/* Async path */}
        <div className="p-10 md:border-r border-white/10 flex flex-col items-start text-left">
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-teal-brand/15 to-teal-brand/8 border border-teal-brand/30 rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-wider uppercase text-teal-brand mb-4">
            Most Popular
          </span>
          <h3 className="text-2xl font-light text-white leading-snug mb-3">
            Choose Your Medication
          </h3>
          <p className="text-sm text-white/55 font-light leading-relaxed flex-1">
            Know which treatment you want? Complete its medical assessment and a
            provider can review and approve your medication within 24 hours.
          </p>
          <div className="text-[1.6rem] font-light text-white mt-5 gradient-text">$0</div>
          <div className="text-xs text-white/40 mt-2 mb-5">
            consult fee — pay only for medication
          </div>
          <Link
            href="#protocols"
            className="w-full text-center btn-primary"
          >
            Browse Treatments &rarr;
          </Link>
          <div className="flex gap-4 mt-3.5">
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-brand" />
              No scheduling
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-brand" />
              24-hr review
            </span>
          </div>
        </div>

        {/* Sync path */}
        <div className="p-10 flex flex-col items-start text-left">
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-brand/15 to-blue-brand/8 border border-blue-brand/30 rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-wider uppercase text-blue-brand mb-4">
            Guided
          </span>
          <h3 className="text-2xl font-light text-white leading-snug mb-3">
            Ask a Provider
          </h3>
          <p className="text-sm text-white/55 font-light leading-relaxed flex-1">
            Not sure what&apos;s right for you? Book a 20-minute video visit and
            a provider will recommend the right protocol based on your goals.
          </p>
          <div className="text-[1.6rem] font-light text-white mt-5 gradient-text">$35</div>
          <div className="text-xs text-white/40 mt-2 mb-5">
            20-minute video visit + cost of medication
          </div>
          <Link
            href="/get-started"
            className="w-full text-center btn-primary"
          >
            Book Video Visit &rarr;
          </Link>
          <div className="flex gap-4 mt-3.5">
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-brand" />
              Personalized plan
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-brand" />
              Live physician
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
