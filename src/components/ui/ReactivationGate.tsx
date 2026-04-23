'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStepValues } from '@/lib/intake-session-store'

function Gate() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
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
 * Silently redirects to /get-started/reactivation when an in-progress
 * intake session is detected. Forwards any ?peptide= param so the
 * reactivation page can restore it if the user starts over.
 */
export default function ReactivationGate() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  )
}
