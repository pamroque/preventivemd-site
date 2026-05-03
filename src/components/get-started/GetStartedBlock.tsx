import Image from 'next/image'
import StartQuestionnaireButton from '@/components/ui/StartQuestionnaireButton'

// "How to get started" — shared between the Welcome page (`/get-started`)
// and the marketing treatment pages (`/treatments/[slug]`). The block
// shows the 4-step timeline, a state-availability footnote, the gradient
// "Start questionnaire" CTA, and trust badges. The ReactivationGate that
// also lives on the welcome page is intentionally NOT part of this block
// — it's specific to returning patients hitting the welcome page.

const HIPAA_BADGE_URL = '/assets/badge-hipaa.png'
const SSL_BADGE_URL   = '/assets/badge-ssl.png'
const LEGIT_BADGE_URL = '/assets/badge-legit.png'

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
      <circle cx="6" cy="6" r="5" stroke="#a1a1aa" strokeWidth="2" />
    </svg>
  )
}

function TimelineConnector({ height }: { height: number }) {
  return (
    <div className="flex flex-col items-center shrink-0 w-3" aria-hidden="true">
      <div className="w-0.5 bg-[#a1a1aa]" style={{ height }} />
    </div>
  )
}

export type GetStartedBlockProps = {
  /** Pre-selects a peptide on the questionnaire when the patient continues. */
  peptide?: string
  /** Optional id for the section element so callers can aria-label it. */
  id?:      string
}

export default function GetStartedBlock({ peptide, id }: GetStartedBlockProps) {
  return (
    <div id={id} className="flex flex-col gap-9 md:gap-12">
      {/* Timeline + state footnote */}
      <section aria-label="How it works" className="flex flex-col gap-3">
        <div className="flex flex-col p-6 rounded-tr-[36px] rounded-bl-[36px] bg-gradient-to-r from-brand-navy to-[#0f172a] text-white">
          <div className="flex items-center gap-4">
            <TimelineDot />
            <p className="flex-1 min-w-0 text-sm leading-5">
              Complete a 5-minute questionnaire
            </p>
          </div>

          <div className="flex items-stretch gap-4">
            <TimelineConnector height={36} />
          </div>

          <div className="flex items-center gap-4">
            <TimelineDot />
            <p className="flex-1 min-w-0 text-sm leading-5">
              Meet with your provider concierge or request your treatment
              <sup className="text-[9px]">†</sup>
            </p>
          </div>

          <div className="flex items-stretch gap-4">
            <TimelineConnector height={36} />
          </div>

          <div className="flex items-center gap-4">
            <TimelineDot />
            <p className="flex-1 min-w-0 text-sm leading-5">
              Pay one upfront price
            </p>
          </div>

          <div className="flex items-stretch gap-4">
            <TimelineConnector height={36} />
          </div>

          <div className="flex items-center gap-4">
            <TimelineDot />
            <p className="flex-1 min-w-0 text-sm leading-5">
              Your provider prescribes if it&rsquo;s the right fit
            </p>
          </div>
        </div>

        <p className="text-xs text-[#71717a] leading-4">
          <sup className="text-[8px]">†</sup>If you live in Kentucky,
          Louisiana, New Mexico, Rhode Island, or West Virginia, you&rsquo;ll
          be required to complete a $99 video consultation initially.
        </p>
      </section>

      {/* CTA + trust badges */}
      <section className="flex flex-col gap-4">
        <StartQuestionnaireButton peptide={peptide} />

        <div className="flex items-center justify-center gap-4">
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="relative shrink-0 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
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

          <div className="relative shrink-0" style={{ width: 46, height: 54 }}>
            <Image
              src={HIPAA_BADGE_URL}
              alt="HIPAA Compliant"
              fill
              sizes="46px"
              className="object-contain"
            />
          </div>

          <div className="relative shrink-0" style={{ width: 48, height: 48 }}>
            <Image
              src={SSL_BADGE_URL}
              alt="SSL Secure Website"
              fill
              sizes="48px"
              className="object-contain"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
