'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStepValues } from '@/lib/intake-session-store'

/**
 * Silently redirects to /get-started/reactivation when an in-progress
 * intake session is detected. Renders nothing — meant to be dropped into
 * the get-started landing page alongside its normal server-rendered content.
 */
export default function ReactivationGate() {
  const router = useRouter()

  useEffect(() => {
    const s0 = getStepValues(0)
    if (typeof s0.firstName === 'string' && s0.firstName) {
      router.replace('/get-started/reactivation')
    }
  }, [router])

  return null
}
