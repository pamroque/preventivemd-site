/**
 * GET /api/availability — list bookable slots for a patient state
 *
 * Pulls real Healthie slots via the EHR adapter (org-level query with
 * licensed_in_state filtering done server-side at Healthie), then maps
 * each slot back to the local provider_id by joining on
 * provider_external_ids, and filters out any slot currently held in
 * provisional_appointments.
 *
 * Public — no auth. Read-only. Same-origin only via Next's CORS defaults.
 *
 * Query params:
 *   state         (required, 2-letter US)
 *   contactType   ("video" | "phone")           — optional
 *   videoOnly     ("1" | "true")                 — when set, forces video and ignores contactType
 *   from          YYYY-MM-DD                     — default: today (patient TZ)
 *   to            YYYY-MM-DD                     — default: from + 14 days
 *
 * Response shape:
 *   {
 *     ok: true,
 *     state, contactType, from, to,
 *     appointmentTypeId,
 *     slots: [
 *       {
 *         slotDatetime:    ISO-8601 string,
 *         durationMinutes: 20,
 *         contactType:     "video" | "phone",
 *         providerId:      Supabase providers.id,
 *         providerName:    "First Last",
 *         healthieUserId:  vendor external id (kept opaque to UI),
 *       },
 *       ...
 *     ],
 *     diagnostics?: { providersConsidered, healthieSlotsRaw, heldSlots, dropped }
 *   }
 *
 * Errors: 400 on bad params, 503 if EHR is down, 500 on unexpected.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEHRAdapter } from '@/lib/ehr'

export const runtime = 'nodejs'
export const maxDuration = 30
// Don't ever cache — provider availability changes minute-to-minute.
export const dynamic = 'force-dynamic'

const DEFAULT_LOOKAHEAD_DAYS = 14
const MAX_LOOKAHEAD_DAYS     = 60

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams

  // ── 1. validate inputs ──────────────────────────────────────────────
  const state = (params.get('state') ?? '').toUpperCase().trim()
  if (!/^[A-Z]{2}$/.test(state)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_state', detail: '`state` must be a 2-letter US code (e.g. NY)' },
      { status: 400 },
    )
  }

  const videoOnly =
    params.get('videoOnly') === '1' || params.get('videoOnly') === 'true'
  const rawContact = params.get('contactType')
  const contactType: 'video' | 'phone' | undefined =
    videoOnly ? 'video' : rawContact === 'phone' ? 'phone' : rawContact === 'video' ? 'video' : undefined

  if (rawContact && !['video', 'phone'].includes(rawContact)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_contactType', detail: 'contactType must be "video" or "phone"' },
      { status: 400 },
    )
  }

  const today = new Date()
  const fromStr = params.get('from') ?? today.toISOString().slice(0, 10)
  const toDefault = new Date(today.getTime() + DEFAULT_LOOKAHEAD_DAYS * 86_400_000)
  const toStr = params.get('to') ?? toDefault.toISOString().slice(0, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_date', detail: '`from`/`to` must be YYYY-MM-DD' },
      { status: 400 },
    )
  }
  const fromDate = new Date(`${fromStr}T00:00:00Z`)
  const toDate   = new Date(`${toStr}T23:59:59Z`)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || toDate < fromDate) {
    return NextResponse.json(
      { ok: false, error: 'invalid_date_range', detail: '`to` must be on or after `from`' },
      { status: 400 },
    )
  }
  const lookaheadDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86_400_000)
  if (lookaheadDays > MAX_LOOKAHEAD_DAYS) {
    return NextResponse.json(
      { ok: false, error: 'lookahead_too_long', detail: `max lookahead is ${MAX_LOOKAHEAD_DAYS} days` },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const adapter  = getEHRAdapter()
  const vendor   = adapter.providerName

  // ── 2. preflight: vendor up? ────────────────────────────────────────
  const ping = await adapter.ping()
  if (!ping.ok) {
    return NextResponse.json(
      { ok: false, error: 'adapter_ping_failed', detail: ping.detail },
      { status: 503 },
    )
  }

  // ── 3. providers licensed in this state, with vendor mapping ────────
  // Same shape as the worker's pickLicensedProvider, but keep ALL of them
  // — we'll dispatch slots to whichever provider Healthie returns them for.
  const { data: providerRows, error: provErr } = await supabase
    .from('providers')
    .select('id, first_name, last_name, license_states, is_active, accepts_new, archived_at, provider_external_ids!inner(external_id, vendor)')
    .is('archived_at', null)
    .eq('is_active', true)
    .eq('accepts_new', true)
    .contains('license_states', [state])
    .eq('provider_external_ids.vendor', vendor)

  if (provErr) {
    return NextResponse.json(
      { ok: false, error: 'provider_lookup_failed', detail: provErr.message },
      { status: 500 },
    )
  }

  type ProviderRow = {
    id: string
    first_name: string | null
    last_name:  string | null
    provider_external_ids: Array<{ external_id: string; vendor: string }>
  }
  const providers = (providerRows ?? []) as unknown as ProviderRow[]

  // Map healthie_user_id → { providerId, providerName }. Slots not
  // mapped to a known provider get dropped — Healthie may include
  // org-admin users without a provider_external_ids row in our DB.
  const externalToLocal = new Map<string, { providerId: string; providerName: string }>()
  for (const p of providers) {
    const mapping = p.provider_external_ids.find((m) => m.vendor === vendor)
    if (!mapping) continue
    externalToLocal.set(mapping.external_id, {
      providerId:   p.id,
      providerName: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || '(unnamed provider)',
    })
  }

  if (externalToLocal.size === 0) {
    return NextResponse.json({
      ok: true,
      state,
      contactType:       contactType ?? 'any',
      from:              fromStr,
      to:                toStr,
      appointmentTypeId: null,
      slots:             [],
      diagnostics: {
        reason: 'no_licensed_providers',
        providersConsidered: 0,
      },
    })
  }

  // ── 4. resolve appointment type id (cached on adapter) ──────────────
  let appointmentTypeId: string
  try {
    appointmentTypeId = await adapter.getDefaultAppointmentTypeId()
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: 'appointment_type_resolve_failed', detail: err?.message ?? String(err) },
      { status: 503 },
    )
  }

  // ── 5. pull slots from Healthie ─────────────────────────────────────
  let rawSlots
  try {
    rawSlots = await adapter.getAvailableSlots({
      state,
      startDate:         fromStr,
      endDate:           toStr,
      contactType,
      appointmentTypeId,
    })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: 'available_slots_failed', detail: err?.message ?? String(err) },
      { status: 502 },
    )
  }

  // ── 6. filter out slots currently held by another patient ───────────
  // Pull active holds for this vendor + this set of providers + this
  // date range. Cheap query — table is small.
  const externalIds = Array.from(externalToLocal.keys())
  const { data: holds, error: holdErr } = await supabase
    .from('provisional_appointments')
    .select('ehr_provider_external_id, slot_datetime')
    .eq('ehr_provider', vendor)
    .in('ehr_provider_external_id', externalIds)
    .gte('slot_datetime', fromDate.toISOString())
    .lte('slot_datetime', toDate.toISOString())
    .gt('expires_at', new Date().toISOString())

  if (holdErr) {
    return NextResponse.json(
      { ok: false, error: 'hold_lookup_failed', detail: holdErr.message },
      { status: 500 },
    )
  }

  // Active-hold lookup by provider+slot. We canonicalize datetimes via
  // Date.parse to dodge string-format drift between Healthie and Postgres.
  const heldKey = (extId: string, iso: string) => `${extId}|${new Date(iso).getTime()}`
  const heldSet = new Set((holds ?? []).map((h) => heldKey(
    h.ehr_provider_external_id as string,
    h.slot_datetime as string,
  )))

  // ── 7. shape response ──────────────────────────────────────────────
  let droppedUnknownProvider = 0
  let droppedHeld = 0
  const slots = rawSlots.flatMap((s) => {
    const local = externalToLocal.get(s.providerExternalId)
    if (!local) {
      droppedUnknownProvider++
      return []
    }
    // Canonicalize Healthie's datetime to ISO. Healthie returns formats
    // like "2026-04-27 09:00:00 EDT -04:00"; new Date() parses it but
    // we run through it explicitly to surface format issues loud.
    const dt = new Date(s.datetime)
    if (Number.isNaN(dt.getTime())) {
      droppedUnknownProvider++   // misclassified as drop, but logged
      return []
    }
    const isoDatetime = dt.toISOString()

    if (heldSet.has(heldKey(s.providerExternalId, isoDatetime))) {
      droppedHeld++
      return []
    }
    return [{
      slotDatetime:    isoDatetime,
      durationMinutes: s.durationMinutes,
      contactType:     s.contactType,
      providerId:      local.providerId,
      providerName:    local.providerName,
      healthieUserId:  s.providerExternalId,
    }]
  })

  // Sort earliest-first so the UI's "auto-select first" lands on the
  // genuinely earliest slot, not whatever order Healthie returned.
  slots.sort((a, b) => a.slotDatetime.localeCompare(b.slotDatetime))

  return NextResponse.json({
    ok: true,
    state,
    contactType: contactType ?? 'any',
    from:        fromStr,
    to:          toStr,
    appointmentTypeId,
    slots,
    diagnostics: {
      providersConsidered: externalToLocal.size,
      healthieSlotsRaw:    rawSlots.length,
      heldSlots:           heldSet.size,
      droppedUnknownProvider,
      droppedHeld,
    },
  })
}
