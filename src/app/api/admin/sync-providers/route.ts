/**
 * /api/admin/sync-providers — Pull providers from EHR into Supabase
 *
 * Calls adapter.listProviders() (vendor-agnostic), upserts results
 * into our `providers` table (canonical) and `provider_external_ids`
 * (cross-system mapping). Providers that exist locally with this
 * vendor's mapping but didn't appear in the upstream pull are marked
 * archived (graceful soft-deactivation).
 *
 * Triggers:
 *   - Vercel cron (vercel.json) every 6 hours, sends GET with CRON_SECRET
 *   - Manual / external — POST with SYNC_WORKER_TOKEN bearer
 *
 * Auth: same pattern as /api/sync/run — accepts either env-var token.
 *
 * Idempotent: safe to call as often as you want. Each call reconciles
 * Supabase to whatever the EHR currently shows.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEHRAdapter } from '@/lib/ehr'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest)  { return runSync(req) }
export async function POST(req: NextRequest) { return runSync(req) }

async function runSync(req: NextRequest) {
  // ── auth ──────────────────────────────────────────────────────────────
  const cronSecret  = process.env.CRON_SECRET
  const workerToken = process.env.SYNC_WORKER_TOKEN
  if (!cronSecret && !workerToken) {
    return NextResponse.json(
      { error: 'Neither CRON_SECRET nor SYNC_WORKER_TOKEN is configured' },
      { status: 500 },
    )
  }
  const auth = req.headers.get('authorization') ?? ''
  const valid =
    (!!cronSecret  && auth === `Bearer ${cronSecret}`) ||
    (!!workerToken && auth === `Bearer ${workerToken}`)
  if (!valid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const adapter  = getEHRAdapter()
  const vendor   = adapter.providerName

  // ── pre-flight ────────────────────────────────────────────────────────
  const ping = await adapter.ping()
  if (!ping.ok) {
    return NextResponse.json(
      { ok: false, reason: 'adapter_ping_failed', detail: ping.detail },
      { status: 503 },
    )
  }

  // ── pull providers from EHR ───────────────────────────────────────────
  let upstream
  try {
    upstream = await adapter.listProviders()
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, reason: 'list_providers_failed', detail: err?.message ?? String(err) },
      { status: 502 },
    )
  }

  if (upstream.length === 0) {
    return NextResponse.json({
      ok:       true,
      vendor,
      fetched:  0,
      created:  0,
      updated:  0,
      archived: 0,
      note:     'EHR returned zero providers — nothing to sync',
    })
  }

  // ── upsert each provider + external_id mapping ───────────────────────
  let created = 0
  let updated = 0
  const seenExternalIds: string[] = []
  const skipped: Array<{ externalId: string; reason: string; name: string }> = []
  const errors:  Array<{ externalId: string; email: string; stage: string; error: string }> = []

  for (const p of upstream) {
    if (!p.email) {
      skipped.push({
        externalId: p.externalId,
        reason:     'missing_email',
        name:       `${p.firstName} ${p.lastName}`.trim() || '(no name)',
      })
      continue
    }
    seenExternalIds.push(p.externalId)

    // Upsert provider row by email. Refresh license_states + name + phone
    // every sync; never overwrite local-only fields like specialties or bio.
    const { data: existing, error: selErr } = await supabase
      .from('providers')
      .select('id, archived_at')
      .ilike('email', p.email)
      .maybeSingle()

    if (selErr) {
      errors.push({ externalId: p.externalId, email: p.email, stage: 'select', error: selErr.message })
      continue
    }

    let providerId: string

    // NOTE: language sync is deliberately deferred. The async intake flow
    // doesn't capture a patient language preference yet, so writing it here
    // would create a routing field with no demand. Re-introduce alongside
    // the language-routing feature when there's a concrete need.

    if (existing) {
      providerId = existing.id
      const updatePayload: Record<string, unknown> = {
        first_name:     p.firstName,
        last_name:      p.lastName,
        phone:          p.phone ?? null,
        npi_number:     p.npi ?? null,
        license_states: p.licenseStates,
        is_active:      p.isActive,
        archived_at:    null,
      }
      const { error: updErr } = await supabase
        .from('providers')
        .update(updatePayload)
        .eq('id', providerId)
      if (updErr) {
        errors.push({ externalId: p.externalId, email: p.email, stage: 'update', error: updErr.message })
        continue
      }
      updated++
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('providers')
        .insert({
          first_name:     p.firstName,
          last_name:      p.lastName,
          email:          p.email,
          phone:          p.phone ?? null,
          npi_number:     p.npi ?? null,
          license_states: p.licenseStates,
          is_active:      p.isActive,
          accepts_new:    true,
        })
        .select('id')
        .single()
      if (insErr || !inserted) {
        errors.push({
          externalId: p.externalId,
          email:      p.email,
          stage:      'insert',
          error:      insErr?.message ?? 'no row returned',
        })
        continue
      }
      providerId = inserted.id
      created++
    }

    const { error: mapErr } = await supabase
      .from('provider_external_ids')
      .upsert(
        {
          provider_id: providerId,
          vendor,
          external_id: p.externalId,
          metadata: {
            isOrgAdmin: p.isOrgAdmin ?? false,
            lastSyncAt: new Date().toISOString(),
          },
        },
        { onConflict: 'provider_id,vendor' },
      )
    if (mapErr) {
      errors.push({ externalId: p.externalId, email: p.email, stage: 'mapping_upsert', error: mapErr.message })
    }
  }

  // ── archive local providers no longer in upstream ─────────────────────
  // Find provider_external_ids for this vendor whose external_id wasn't
  // returned in this pull, and soft-archive their providers row.
  let archived = 0
  if (seenExternalIds.length > 0) {
    const { data: stale } = await supabase
      .from('provider_external_ids')
      .select('provider_id, external_id')
      .eq('vendor', vendor)
      .not('external_id', 'in', `(${seenExternalIds.map((id) => `"${id}"`).join(',')})`)

    if (stale && stale.length > 0) {
      const ids = stale.map((s: any) => s.provider_id)
      const { error: archErr } = await supabase
        .from('providers')
        .update({ archived_at: new Date().toISOString(), is_active: false })
        .in('id', ids)
        .is('archived_at', null)
      if (!archErr) archived = stale.length
    }
  }

  // ── diagnostic block ────────────────────────────────────────────────
  // If ?debug=1 is passed, include a redacted summary of every provider
  // the EHR returned. Useful for "fetched=N but created=0" debugging.
  const debug = req.nextUrl.searchParams.get('debug') === '1'
  const upstreamSummary = debug
    ? upstream.map((p) => ({
        externalId:    p.externalId,
        name:          `${p.firstName} ${p.lastName}`.trim() || '(no name)',
        email:         p.email || '(empty)',
        licenseStates: p.licenseStates,
        isActive:      p.isActive,
        isOrgAdmin:    p.isOrgAdmin,
      }))
    : undefined

  return NextResponse.json({
    ok: true,
    vendor,
    fetched:  upstream.length,
    created,
    updated,
    archived,
    skipped,                            // always shown so silent-skip is visible
    errors,                             // always shown so silent-fail is visible
    ...(debug ? { upstream: upstreamSummary } : {}),
  })
}
