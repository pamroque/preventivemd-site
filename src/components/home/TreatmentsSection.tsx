import Link from 'next/link'
import Image from 'next/image'
import TreatmentsWispParallax from './TreatmentsWispParallax'
import TreatmentAudioButton from './TreatmentAudioButton'

type TreatmentSlug = 'glutathione' | 'ghk-cu' | 'nad' | 'semaglutide' | 'sermorelin' | 'tirzepatide' | 'foundayo' | 'wegovy' | 'zepbound'

type Treatment = {
  slug: TreatmentSlug
  name: string
  /** Optional registered-trademark suffix (rendered smaller, raised). */
  trademark?: '®'
  description: string
  thumbnail: string
  href: string
  detailHref: string
  /** Optional pronunciation clip (e.g. `/assets/audio/glutathione.mp3`).
   *  When unset, the audio button falls back to the browser's
   *  SpeechSynthesis API speaking `name`. */
  audioSrc?: string
}

const TREATMENTS: Treatment[] = [
  {
    slug: 'glutathione',
    name: 'Glutathione',
    description: 'An antioxidant the body produces, involved in cellular and metabolic processes.',
    thumbnail: '/assets/home/vial-generic.png',
    href: '/get-started?peptide=glutathione',
    detailHref: '/treatments/glutathione',
  },
  {
    slug: 'ghk-cu',
    name: 'GHK-Cu',
    description: 'A copper-binding peptide found in the body, studied for its role in skin and tissue health.',
    thumbnail: '/assets/home/ghk-cu.png',
    href: '/get-started?peptide=ghk-cu',
    detailHref: '/treatments/ghk-cu',
  },
  {
    slug: 'nad',
    name: 'NAD+',
    description: 'A coenzyme found in every cell, central to energy metabolism and cellular function.',
    thumbnail: '/assets/home/vial-generic.png',
    href: '/get-started?peptide=nad',
    detailHref: '/treatments/nad',
    audioSrc: '/assets/audio/nad.mp3',
  },
  {
    slug: 'semaglutide',
    name: 'Semaglutide',
    description: 'Builds on GLP-1, a natural hormone involved in appetite and metabolic regulation.',
    thumbnail: '/assets/home/vial-generic.png',
    href: '/get-started?peptide=semaglutide',
    detailHref: '/treatments/semaglutide',
  },
  {
    slug: 'sermorelin',
    name: 'Sermorelin',
    description: "Builds on GHRH, the body's natural signal for growth hormone release.",
    thumbnail: '/assets/home/vial-generic.png',
    href: '/get-started?peptide=sermorelin',
    detailHref: '/treatments/sermorelin',
  },
  {
    slug: 'tirzepatide',
    name: 'Tirzepatide',
    description: 'Builds on GLP-1 and GIP, two natural hormones involved in appetite and metabolic regulation.',
    thumbnail: '/assets/home/vial-generic.png',
    href: '/get-started?peptide=tirzepatide',
    detailHref: '/treatments/tirzepatide',
    audioSrc: '/assets/audio/tirzepatide.mp3',
  },
  {
    slug: 'foundayo',
    name: 'Foundayo',
    trademark: '®',
    description: 'Builds on GLP-1, a natural hormone involved in appetite and metabolic regulation. A once-daily oral pill taken anytime, with or without food.',
    thumbnail: '/assets/home/foundayo.png',
    href: '/get-started?peptide=foundayo',
    detailHref: '/treatments/foundayo',
  },
  {
    slug: 'wegovy',
    name: 'Wegovy',
    trademark: '®',
    description: 'The FDA-approved branded version of semaglutide. Builds on GLP-1, a natural hormone involved in appetite and metabolic regulation.',
    thumbnail: '/assets/home/wegovy.png',
    href: '/get-started?peptide=wegovy',
    detailHref: '/treatments/wegovy',
  },
  {
    slug: 'zepbound',
    name: 'Zepbound',
    trademark: '®',
    description: 'The FDA-approved branded version of tirzepatide. Builds on GLP-1 and GIP, two natural hormones involved in appetite and metabolic regulation.',
    thumbnail: '/assets/home/zepbound.png',
    href: '/get-started?peptide=zepbound',
    detailHref: '/treatments/zepbound',
    audioSrc: '/assets/audio/zepbound.mp3',
  },
]

function TreatmentCard({ treatment, eager = false }: { treatment: Treatment; eager?: boolean }) {
  return (
    <article className="flex flex-col items-center gap-6 rounded-[36px] border border-[#e4e4e7] bg-white/80 p-8 backdrop-blur-[2px]">
      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full items-center gap-3">
          <h3 className="font-serif italic text-[2rem] leading-[1.1] text-[#09090b]">
            {treatment.name}
            {treatment.trademark && (
              <span className="text-[1.29rem] align-baseline ml-0.5">
                {treatment.trademark}
              </span>
            )}
          </h3>
          <TreatmentAudioButton name={treatment.name} audioSrc={treatment.audioSrc} />
        </div>
        <p className="text-base leading-6 text-[#09090b]">{treatment.description}</p>
      </div>

      <div className="relative size-[144px] shrink-0">
        <Image
          src={treatment.thumbnail}
          alt=""
          fill
          sizes="144px"
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          className="object-contain"
        />
      </div>

      <div className="flex w-full items-start gap-3">
        <Link
          href={treatment.detailHref}
          className="flex flex-1 items-center justify-center gap-3 rounded-lg border border-[#e4e4e7] bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.96px] leading-6 text-[#09090b] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
        >
          Learn more
        </Link>
        <Link
          href={treatment.href}
          className="relative flex flex-1 items-center justify-center gap-3 rounded-lg border border-[#3A5190] bg-[#3A5190] px-4 py-2 text-base font-medium leading-6 text-white shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.15)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2"
        >
          Get started
        </Link>
      </div>
    </article>
  )
}

export default function TreatmentsSection() {
  return (
    <section
      id="treatments"
      aria-labelledby="treatments-heading"
      className="relative flex scroll-mt-16 flex-col items-center gap-9 md:scroll-mt-20 md:gap-12"
    >
      {/* Decorative wisp background — desktop only. Drifts at ~60% scroll
          speed for a subtle parallax. See TreatmentsWispParallax.tsx. */}
      <TreatmentsWispParallax />

      {/* Title */}
      <div className="relative flex w-full flex-col gap-3">
        <p className="text-sm font-medium leading-5 text-[#71717a] md:text-base md:leading-6">
          Our treatments
        </p>
        <h2
          id="treatments-heading"
          className="font-extralight leading-[1.1] text-[#09090b]"
        >
          <span className="text-4xl md:text-[3.375rem]">Physician-curated </span>
          <span className="font-serif italic text-[2.625rem] md:text-[4rem]">protocols</span>
        </h2>
      </div>

      {/* Grid: 1 col below lg (mobile + tablet), 3 col at lg+. Eager-load the
          first row so the section never lands blank when the user scrolls in. */}
      <div className="relative grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        {TREATMENTS.map((t, i) => (
          <TreatmentCard key={t.slug} treatment={t} eager={i < 3} />
        ))}
      </div>
    </section>
  )
}
