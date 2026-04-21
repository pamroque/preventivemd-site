/*
 * HOMEPAGE — src/app/page.tsx
 *
 * KEY CONCEPT: This file IS the route for "/"
 *
 * In Next.js App Router, the URL structure mirrors the file structure:
 *   src/app/page.tsx           → /
 *   src/app/treatments/page.tsx → /treatments
 *   src/app/assessment/page.tsx → /assessment
 *
 * This is a Server Component by default. It imports both server and
 * client components. Server components (StatsStrip, GallerySection, etc.)
 * render to HTML on the server. Client components (HeroSection,
 * ProtocolsSection) also render on the server for the initial HTML,
 * then "hydrate" in the browser to become interactive.
 *
 * The result: fast initial page load (all HTML is there immediately)
 * + interactivity where you need it.
 */

import { HeroSection } from '@/components/ui/HeroSection'
import { StatsStrip } from '@/components/ui/StatsStrip'
import { GallerySection } from '@/components/ui/GallerySection'
import { HowItWorksSection } from '@/components/ui/HowItWorksSection'
import { ProtocolsSection } from '@/components/ui/ProtocolsSection'
import { CTASection } from '@/components/ui/CTASection'

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <HeroSection />
      <StatsStrip />
      <GallerySection />
      <HowItWorksSection />
      <CTASection />
      <ProtocolsSection />
    </main>
  )
}
