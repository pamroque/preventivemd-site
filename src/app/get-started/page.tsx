import EveGreeting from '@/components/get-started/EveGreeting'
import GetStartedBlock from '@/components/get-started/GetStartedBlock'
import ReactivationGate from '@/components/ui/ReactivationGate'

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
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-white pt-12 pb-[52px] md:pt-14 md:pb-0 focus:outline-none">
      <ReactivationGate />
      <div className="mx-auto w-full px-4 py-9 md:max-w-[560px] md:px-0 md:py-12 flex flex-col gap-9 md:gap-12">
        <EveGreeting headingId="greeting-heading" />
        <GetStartedBlock peptide={peptide} />
      </div>
    </main>
  )
}
