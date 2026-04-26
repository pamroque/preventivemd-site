/**
 * Care Portal — Journey landing page (post-auth).
 *
 * Placeholder for now; the real dashboard content will live here once we
 * have an authenticated session and data to show. Header (mobile + desktop)
 * and bottom nav are rendered globally by SiteNav; SiteNav swaps in the
 * post-auth Journey nav variant for this route.
 */

export const metadata = {
  title: 'Journey · PreventiveMD',
}

export default function JourneyPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-[100dvh] bg-white pt-12 md:pt-14 pb-24 focus:outline-none"
    >
      <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 py-9 md:py-12">
        <h1 className="sr-only">Your journey</h1>
        {/* Intentionally empty — design is currently a blank canvas */}
      </div>
    </main>
  )
}
