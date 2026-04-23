import Link from 'next/link'
import Image from 'next/image'
import MedicationCarousel from '@/components/ui/MedicationCarousel'
import StartQuestionnaireButton from '@/components/ui/StartQuestionnaireButton'
import ReactivationGate from '@/components/ui/ReactivationGate'

// Local assets — exported at 2x, rendered at 1x display size
const AVATAR_URL = '/assets/avatar-eve.png'
const HIPAA_BADGE_URL = '/assets/badge-hipaa.png'
const SSL_BADGE_URL = '/assets/badge-ssl.png'
const LEGIT_BADGE_URL = '/assets/badge-legit.png'

/** Small grey circle used as a timeline step indicator */
function TimelineDot() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="5" stroke="#bdbdbd" strokeWidth="2" />
    </svg>
  )
}

/** Vertical grey line connecting timeline steps */
function TimelineConnector({ height }: { height: number }) {
  return (
    <div className="flex flex-col items-center shrink-0 w-3" aria-hidden="true">
      <div className="w-0.5 bg-[#bdbdbd]" style={{ height }} />
    </div>
  )
}

/** Heroicon: chevron-right (micro / 20px solid) */
function ChevronRightIcon({ className }: { className?: string }) {
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
        d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ peptide?: string }>
}) {
  const { peptide } = await searchParams
  return (
    /*
     * pt-12 → clears mobile top header (h-12)
     * pt-14 md → clears desktop nav (h-14)
     * pb-28 → clears mobile bottom nav bar (h-16) + 16px gap + safe area
     */
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-white pt-12 pb-28 md:pt-14 md:pb-12 focus:outline-none">
      <ReactivationGate />
      <div className="mx-auto w-full px-4 py-9 md:max-w-lg md:px-0 md:py-12 lg:max-w-[480px] flex flex-col gap-9 md:gap-12">

        {/* ── Greeting ── */}
        <section aria-labelledby="greeting-heading" className="flex items-start gap-3 md:gap-4">
          {/* Avatar — 2x export displayed at 1x (32px mobile / 40px desktop) */}
          <div className="shrink-0 relative size-8 md:size-10 rounded-full overflow-hidden">
            <Image
              src={AVATAR_URL}
              alt="Eve, your PreventiveMD concierge"
              fill
              sizes="40px"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <h1
              id="greeting-heading"
              className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)]"
            >
              Hi, I&rsquo;m Eve, your concierge. Getting started is simple.
            </h1>
          </div>
        </section>

        {/* ── Timeline ── */}
        <section aria-label="How it works" className="flex flex-col">
          {/* Step 1 */}
          <div className="flex items-center gap-4">
            <TimelineDot />
            <p className="text-sm leading-5 text-[rgba(0,0,0,0.87)] flex-1 min-w-0">
              Complete a 5-minute questionnaire
            </p>
          </div>

          {/* Short connector */}
          <div className="flex items-stretch gap-4">
            <TimelineConnector height={36} />
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-4">
            <TimelineDot />
            <p className="text-sm leading-5 text-[rgba(0,0,0,0.87)] flex-1 min-w-0">
              <span className="text-xs font-medium tracking-[1.5px] uppercase mr-1">
                Pick a path:
              </span>
              Choose your medications* or get guidance from a provider live
            </p>
          </div>

          {/* Long connector with carousel */}
          <div className="flex items-stretch gap-4">
            <TimelineConnector height={96} />
            <div className="flex-1 min-w-0 flex items-center pl-3 overflow-hidden">
              <MedicationCarousel />
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-4">
            <TimelineDot />
            <p className="text-sm leading-5 text-[rgba(0,0,0,0.87)] flex-1 min-w-0">
              A licensed provider reviews your request
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section aria-labelledby="cta-heading" className="flex flex-col gap-4">
          <h2 id="cta-heading" className="sr-only">Start your intake</h2>

          {/* Primary CTA button — saves get-started Q&A to session store */}
          <StartQuestionnaireButton peptide={peptide} />

          {/* Legal copy */}
          <p className="text-sm text-[#71717a] text-center leading-5">
            By continuing, you agree to our{' '}
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0778ba] underline underline-offset-2"
            >
              Terms &amp; Conditions
            </a>{' '}
            and acknowledge our{' '}
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0778ba] underline underline-offset-2"
            >
              Privacy Policy
            </a>
            .
          </p>

          {/* Trust badges — 2x exports rendered at their 1x display dimensions */}
          <div className="flex items-center justify-center gap-4">
            {/* HIPAA — 1x display: 46×54 */}
            <div className="relative shrink-0" style={{ width: 46, height: 54 }}>
              <Image
                src={HIPAA_BADGE_URL}
                alt="HIPAA Compliant"
                fill
                sizes="46px"
                className="object-contain"
              />
            </div>

            {/* SSL Secure — 1x display: 48×48 */}
            <div className="relative shrink-0" style={{ width: 48, height: 48 }}>
              <Image
                src={SSL_BADGE_URL}
                alt="SSL Secure Website"
                fill
                sizes="48px"
                className="object-contain"
              />
            </div>

            {/* LegitScript — 1x display: 50×54, clickable (URL TBD) */}
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="relative shrink-0 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
              style={{ width: 50, height: 54 }}
              aria-label="LegitScript Certified (opens in new tab)"
            >
              <Image
                src={LEGIT_BADGE_URL}
                alt="LegitScript Certified"
                fill
                sizes="50px"
                className="object-contain"
              />
            </a>
          </div>
        </section>

        {/* ── Footnote ── */}
        <p className="text-xs text-[#71717a] leading-4 text-center">
          *If you live in Kentucky, Louisiana, Mississippi, New Mexico, Rhode
          Island, or West Virginia, you&rsquo;ll be required to complete a $35
          video consultation initially.
        </p>
      </div>
    </main>
  )
}
