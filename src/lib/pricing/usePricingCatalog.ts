/**
 * usePricingCatalog — Client-side fetch + cache of the price catalog
 *
 * Pulls /api/treatments/pricing once on mount and caches at module level
 * so subsequent mounts in the same session reuse the in-memory copy
 * (the API itself is also CDN-cached for 5 minutes).
 *
 * Use in a 'use client' component:
 *
 *   const { catalog, loading } = usePricingCatalog()
 *   const cents = catalog?.treatments['semaglutide']?.formulations['injection']?.prices['1mo']
 *   const dollars = cents != null ? cents / 100 : null
 */

'use client'

import { useEffect, useState } from 'react'

export interface PricingCatalog {
  currency: string
  treatments: Record<string, {
    name: string
    formulations: Record<string, {
      label:  string
      prices: Record<string, number>   // term -> amount_cents
    }>
  }>
  services: Record<string, {
    name:         string
    amount_cents: number
    currency:     string
    type:         'one_time' | 'recurring'
  }>
}

// Module-level cache so the network call only happens once per session.
let cached:    PricingCatalog | null = null
let inflight:  Promise<PricingCatalog> | null = null

async function fetchCatalog(): Promise<PricingCatalog> {
  if (cached) return cached
  if (inflight) return inflight

  inflight = fetch('/api/treatments/pricing', { cache: 'force-cache' })
    .then(async (r) => {
      if (!r.ok) throw new Error(`pricing fetch failed: ${r.status}`)
      const data = (await r.json()) as PricingCatalog
      cached = data
      return data
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function usePricingCatalog(): {
  catalog: PricingCatalog | null
  loading: boolean
  error:   string | null
} {
  const [catalog, setCatalog] = useState<PricingCatalog | null>(cached)
  const [loading, setLoading] = useState<boolean>(!cached)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (cached) return
    let cancelled = false
    fetchCatalog()
      .then((data) => {
        if (cancelled) return
        setCatalog(data)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { catalog, loading, error }
}


// ─── Helpers for callers ─────────────────────────────────────────────────────

/** Returns the price in cents for a (slug, formulation, term) triple, or null
 *  if the catalog hasn't loaded yet or the combination doesn't exist. */
export function lookupPriceCents(
  catalog:        PricingCatalog | null,
  treatmentSlug:  string,
  formulationId:  string,
  termId:         string,
): number | null {
  if (!catalog) return null
  return catalog.treatments[treatmentSlug]?.formulations[formulationId]?.prices[termId] ?? null
}
