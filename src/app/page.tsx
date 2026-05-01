import HomeHero from '@/components/home/HomeHero'
import QuickStartTiles from '@/components/home/QuickStartTiles'
import PeptidesSection from '@/components/home/PeptidesSection'
import TreatmentsSection from '@/components/home/TreatmentsSection'
import ProcessSection from '@/components/home/ProcessSection'
import AboutSection from '@/components/home/AboutSection'
import FaqsSection from '@/components/home/FaqsSection'
import HomeFooter from '@/components/home/HomeFooter'

export default function HomePage() {
  return (
    <main
      tabIndex={-1}
      className="bg-white p-2 pb-20 md:p-4 focus:outline-none"
    >
      {/* Hero + quick-start tiles share Figma's <header> grouping. The
          hero itself carries `id="home-hero"`, which SiteNav observes to
          decide whether to hide itself: while any part of the hero is in
          the viewport, the fixed nav stays out of the way and the hero's
          embedded logo + accessibility utility take over. The quick-start
          tiles below the hero render with the nav already visible. */}
      <div className="flex flex-col gap-2 md:gap-4">
        <HomeHero />
        <QuickStartTiles />
      </div>

      {/* Editorial: peptides + treatments. Top margin matches the gap used
          for every other section transition (72/108) so the rhythm under
          the header is consistent. */}
      <div className="mt-[72px] flex flex-col gap-[72px] px-2 md:mt-[108px] md:gap-[108px] md:px-[144px]">
        <PeptidesSection />
        <TreatmentsSection />
      </div>

      {/* Process — full-bleed like header/footer so the dark container
          matches the hero's horizontal scope. */}
      <div className="mt-[72px] md:mt-[108px]">
        <ProcessSection />
      </div>

      <div className="mt-[72px] flex flex-col gap-[72px] px-2 md:mt-[108px] md:gap-[108px] md:px-[144px]">
        <AboutSection />
        <FaqsSection />
      </div>

      <div className="mt-12 md:mt-[72px]">
        <HomeFooter />
      </div>
    </main>
  )
}
