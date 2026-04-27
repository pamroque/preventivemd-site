/**
 * POST /api/availability/reserve — soft-hold a slot for the patient
 *
 * Called by /book-consultation when the patient clicks a slot. Creates
 * a 10-minute hold in `provisional_appointments`. The patient then has
 * 10 minutes to complete /checkout; once promoted at /checkout submit,
 * the hold is deleted and a real appointments row takes its place.
 *
 * Why "delete-then-insert": the unique index on (vendor, provider, slot)
 * isn't a partial index (`now()` not allowed in predicates), so an expired
 * hold for the same slot would block a new INSERT. We sweep expired
 * matches first to keep the path clean.
 *
 * Concurrency: two concurrent inserts for the same slot race; the second
 * gets a unique-violation and we surface 409. The losing client should
 * pick another slot.
 *
 * Body:
 *   providerId    — Supabase providers.id
 *   slotDatetime  — ISO-8601 string (must match what /api/availability returned)
 *   contactType   — "video" | "phone"
 *   sessionToken  — pmd_intake_session cookie value
 *
 * Response (201): { ok: true, holdId, expiresAt, providerId, slotDatetime, contactType }
 * Response (409): { ok: false, error: "slot_conflict", currentExpiresAt }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEHRAdapter } from '@/lib/ehr'

export const runtime = 'nodejs'
export const maxDuration = 15
export const dynamic = 'force-dynamic'

const HOLD_TTL_MIN = 10

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    )
  }

  const { providerId, slotDatetime, contactType, sessionToken } = body ?? {}

  // ── 1. validate ─────────────────────────────────────────────────────
  if (typeof providerId !== 'string' || !/^[0-9a-f-]{36}$/i.test(providerId)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_providerId' },
      { status: 400 },
    )
  }
  if (typeof sessionToken !== 'string' || sessionToken.length < 8) {
    return NextResponse.json(
      { ok: false, error: 'invalid_sessionToken' },
      { status: 400 },
    )
  }
  if (!['video', 'phone'].includes(contactType)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_contactType' },
      { status: 400 },
    )
  }
  if (typeof slotDatetime !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'invalid_slotDatetime' },
      { status: 400 },
    )
  }
  const slotDate = new Date(slotDatetime)
  if (Number.isNaN(slotDate.getTime())) {
    return NextResponse.json(
      { ok: false, error: 'unparseable_slotDatetime' },
      { status: 400 },
    )
  }
  if (slotDate.getTime() < Date.now() - 60_000) {
    return NextResponse.json(
      { ok: false, error: 'slot_in_the_past' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const adapter  = getEHRAdapter()
  const vendor   = adapter.providerName
  const slotIso  = slotDate.toISOString()

  // ── 2. resolve provider's vendor external id ────────────────────────
  const { data: providerRow, error: provErr } = await supabase
    .from('providers')
    .select('id, archived_at, is_active, accepts_new, provider_external_ids!inner(external_id, vendor)')
    .eq('id', providerId)
    .eq('provider_external_ids.vendor', vendor)
    .maybeSingle()

  if (provErr) {
    return NextResponse.json(
      { ok: false, error: 'provider_lookup_failed', detail: provErr.message },
      { status: 500 },
    )
  }
  if (!providerRow) {
    return NextResponse.json(
      { ok: false, error: 'unknown_provider' },
      { status: 404 },
    )
  }
  if (providerRow.archived_at || !providerRow.is_active || !providerRow.accepts_new) {
    return NextResponse.json(
      { ok: false, error: 'provider_unavailable' },
      { status: 409 },
    )
  }
  const externalIds = (providerRow.provider_external_ids ?? []) as Array<{ external_id: string; vendor: string }>
  const mapping = externalIds.find((m) => m.vendor === vendor)
  if (!mapping) {
    return NextResponse.json(
      { ok: false, error: 'provider_not_synced_to_vendor' },
      { status: 500 },
    )
  }

  // ── 3. sweep expired holds for THIS slot ────────────────────────────
  // Without this, an unswept expired row for the same (vendor, provider,
  // slot) tuple would trip the unique constraint when we INSERT a fresh
  // hold. Cheap idempotent op — at most a handful of rows.
  await supabase
    .from('provisional_appointments')
    .delete()
    .eq('ehr_provider', vendor)
    .eq('ehr_provider_external_id', mapping.external_id)
    .eq('slot_datetime', slotIso)
    .lte('expires_at', new Date().toISOString())

  // ── 4. INSERT the hold ──────────────────────────────────────────────
  const expiresAt = new Date(Date.now() + HOLD_TTL_MIN * 60_000).toISOString()
  const { data: inserted, error: insErr } = await supabase
    .from('provisional_appointments')
    .insert({
      session_token:            sessionToken,
      provider_id:              providerId,
      ehr_provider:             vendor,
      ehr_provider_external_id: mapping.external_id,
      slot_datetime:            slotIso,
      contact_type:             contactType,
      expires_at:               expiresAt,
    })
    .select('id, expires_at')
    .single()

  if (insErr) {
    // Postgres unique violation = 23505. Surface 409 with the conflicting
    // hold's expires_at so the UI can tell the patient how long to wait.
    if ((insErr as any)?.code === '23505' || /duplicate/i.test(insErr.message)) {
      const { data: existing } = await supabase
        .from('provisional_appointments')
        .select('expires_at')
        .eq('ehr_provider', vendor)
        .eq('ehr_provider_external_id', mapping.external_id)
        .eq('slot_datetime', slotIso)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
      return NextResponse.json(
        {
          ok: false,
          error: 'slot_conflict',
          currentExpiresAt: existing?.expires_at ?? null,
          detail: 'this slot was just taken — please pick another',
        },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { ok: false, error: 'reserve_failed', detail: insErr.message },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      ok: true,
      holdId:       inserted!.id,
      expiresAt:    inserted!.expires_at,
      providerId,
      slotDatetime: slotIso,
      contactType,
    },
    { status: 201 },
  )
}
