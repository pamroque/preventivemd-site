import Link from 'next/link'

/*
 * HowItWorksSection.tsx — Split layout with photo + flow steps
 *
 * Server Component. The "How It Works" section with the forking
 * pathway diagram.
 */

export function HowItWorksSection() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2">
      {/* Photo side */}
      <div className="relative min-h-[400px] lg:min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=85"
          alt="Doctor consultation"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content side */}
      <div className="bg-bg px-8 md:px-16 py-16 flex flex-col justify-center">
        <div className="section-label">How It Works</div>
        <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-extralight tracking-tight text-navy mb-4">
          Two ways to get started.
        </h2>
        <p className="text-[0.92rem] text-muted font-light leading-relaxed mb-8 max-w-[520px]">
          Choose your medication and complete a 5-minute assessment, or talk to
          a provider who can help you find the right fit — either way, a
          licensed provider reviews everything before anything is prescribed.
        </p>

        {/* Flow steps */}
        <div className="space-y-0">
          {/* Step 1 */}
          <FlowStep num={1} text="Complete a 5-minute health intake" />
          <FlowConnector />

          {/* Step 2: Fork */}
          <FlowStep num={2} text="Pick your path" />
          <div className="ml-10 mt-2 mb-2 flex flex-col sm:flex-row items-stretch gap-3">
            <Link
              href="#protocols"
              className="flex-1 p-4 rounded-xl border border-teal-brand/30 bg-teal-brand/5 no-underline hover:bg-teal-brand/10 transition-colors"
            >
              <div className="text-sm font-semibold text-navy">Choose Your Medication</div>
              <div className="text-xs font-semibold text-teal-brand mt-1">$0 — No consult fee</div>
              <div className="text-xs text-muted font-light mt-1.5 leading-relaxed">
                Already know what you want? Complete its assessment and a provider
                can approve within 24 hrs.
              </div>
            </Link>
            <div className="flex items-center justify-center text-xs text-muted font-light">or</div>
            <Link
              href="/assessment?type=sync"
              className="flex-1 p-4 rounded-xl border border-blue-brand/25 bg-blue-brand/5 no-underline hover:bg-blue-brand/10 transition-colors"
            >
              <div className="text-sm font-semibold text-navy">Ask a Provider</div>
              <div className="text-xs font-semibold text-blue-brand mt-1">$35 — 20-min video visit</div>
              <div className="text-xs text-muted font-light mt-1.5 leading-relaxed">
                Not sure yet? A provider will recommend the right fit based on
                your goals.
              </div>
            </Link>
          </div>
          <FlowConnector />

          {/* Step 3 */}
          <FlowStep num={3} text="Provider reviews and prescribes your medication" />
          <FlowConnector />

          {/* Step 4 */}
          <FlowStep num={4} text="Medication delivered discreetly to your door" />
        </div>
      </div>
    </section>
  )
}

// Small helper components — no need for separate files
function FlowStep({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-brand-gradient text-white text-xs font-semibold flex items-center justify-center shrink-0">
        {num}
      </div>
      <div className="text-sm text-navy font-medium">{text}</div>
    </div>
  )
}

function FlowConnector() {
  return <div className="w-px h-6 bg-border ml-3.5" />
}
