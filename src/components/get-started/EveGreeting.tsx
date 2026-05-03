import Image from 'next/image'

// Eve's standardized welcome block — avatar + greeting + state-availability
// footnote. Used on the Welcome page (as the page's h1) and at the
// bottom of each treatment marketing page (as a secondary h2 introducing
// the "How to get started" block).

const AVATAR_URL = '/assets/avatar-eve.png'

export type EveGreetingProps = {
  /** Heading level for the title — defaults to h1 (welcome page). Use
   *  h2 on pages where another heading already serves as h1. */
  headingLevel?: 'h1' | 'h2'
  /** DOM id for the heading so callers can `aria-labelledby` the
   *  surrounding section. */
  headingId?:    string
}

export default function EveGreeting({
  headingLevel = 'h1',
  headingId    = 'eve-greeting-heading',
}: EveGreetingProps) {
  const HeadingTag = headingLevel
  return (
    <section aria-labelledby={headingId} className="flex items-start gap-3 md:gap-4">
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
        <HeadingTag
          id={headingId}
          className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)]"
        >
          Hi, I&rsquo;m Eve, your concierge. Getting started is simple.
        </HeadingTag>
        <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5">
          Please note that we are not yet available in Alaska, Mississippi, and New Jersey.{' '}
          <a
            href="/waitlist"
            className="text-brand-blue underline underline-offset-2"
          >
            Sign up
          </a>{' '}
          to get notified once we are.
        </p>
      </div>
    </section>
  )
}
