'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStepValues, getSubmission } from '@/lib/intake-session-store'

function Gate() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Already-submitted intakes take precedence — land the user back on
    // the confirmation page instead of re-starting or reactivating.
    if (getSubmission()) {
      router.replace('/get-started/confirmation')
      return
    }

    const s0 = getStepValues(0)
    if (typeof s0.firstName === 'string' && s0.firstName) {
      const peptide = searchParams.get('peptide')
      const dest = peptide
        ? `/get-started/reactivation?peptide=${encodeURIComponent(peptide)}`
        : '/get-started/reactivation'
      router.replace(dest)
    }
  }, [router, searchParams])

  return null
}

/**
 * Silently redirects /get-started visitors based on their session state:
 *  - Submitted intake → /get-started/confirmation
 *  - In-progress intake (name captured) → /get-started/reactivation
 *  - No session → renders nothing, lets /get-started load normally
 *
 * Forwards any ?peptide= param to reactivation so the user can restore it
 * if they choose to start over.
 */
export default function ReactivationGate() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  )
}
