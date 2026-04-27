/**
 * GET  /api/availability/reserve/:holdId — read a hold (powers /checkout countdown)
 * DELETE /api/availability/reserve/:holdId — explicit release on back-nav or expiry
 *
 * Auth model: holds belong to a session_token (set by the intake cookie).
 * Only the same session that created the hold can read or release it. We
 * don't have a real user identity at this stage — sessionToken-equals-cookie
 * is the strongest signal we've got, and consistent with how /api/intake
 * currently authorizes draft access.
 *
 * GET response (200): { ok: true, holdId, expiresAt, providerId, providerName,
 *                       slotDatetime, contactType, expired }
 * GET 404 if hold doesn't exist or doesn't belong to this session.
 * GET 410 if the hold has expired (still readable so /checkout can render
 *         "your slot expired" without a separate 404 path).
 *
 * DELETE response (200): { ok: true, deleted: 1|0 }
 * DELETE 404 if no hold with that id was owned by this session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 10
export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'pmd_intake_session'

function readSessionToken(req: NextRequest): string | null {
  // Allow overriding via header for non-browser callers (smoke tests).
  const headerTok = req.headers.get('x-session-token')
  if (headerTok && headerTok.length >= 8) return headerTok
  const cookieTok = req.cookies.get(COOKIE_NAME)?.value
  return cookieTok && cookieTok.length >= 8 ? cookieTok : null
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ holdId: string }> },
) {
  const { holdId } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(holdId)) {
    return NextResponse.json({ ok: false, error: 'invalid_holdId' }, { status: 400 })
  }

  const sessionToken = readSessionToken(req)
  if (!sessionToken) {
    return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('provisional_appointments')
    .select('id, session_token, provider_id, ehr_provider, ehr_provider_external_id, slot_datetime, contact_type, expires_at, providers(first_name, last_name)')
    .eq('id', holdId)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'hold_lookup_failed', detail: error.message },
      { status: 500 },
    )
  }
  if (!data || data.session_token !== sessionToken) {
    // Same response either way — don't leak hold existence to other sessions.
    return NextResponse.json({ ok: false, error: 'hold_not_found' }, { status: 404 })
  }

  const provider: any = data.providers
  const providerName = provider
    ? `${provider.first_name ?? ''} ${provider.last_name ?? ''}`.trim() || '(unnamed provider)'
    : '(unknown)'

  const expired = new Date(data.expires_at as string).getTime() <= Date.now()

  return NextResponse.json(
    {
      ok:           true,
      holdId:       data.id,
      expiresAt:    data.expires_at,
      providerId:   data.provider_id,
      providerName,
      slotDatetime: data.slot_datetime,
      contactType:  data.contact_type,
      expired,
    },
    { status: expired ? 410 : 200 },
  )
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ holdId: string }> },
) {
  const { holdId } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(holdId)) {
    return NextResponse.json({ ok: false, error: 'invalid_holdId' }, { status: 400 })
  }

  const sessionToken = readSessionToken(req)
  if (!sessionToken) {
    return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })
  }

  const supabase = createAdminClient()
  // Scope DELETE by both id AND session_token so a leaked id can't release
  // someone else's hold. The .delete().select() pattern lets us count rows.
  const { data, error } = await supabase
    .from('provisional_appointments')
    .delete()
    .eq('id', holdId)
    .eq('session_token', sessionToken)
    .select('id')

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'release_failed', detail: error.message },
      { status: 500 },
    )
  }

  const deleted = data?.length ?? 0
  if (deleted === 0) {
    return NextResponse.json({ ok: false, error: 'hold_not_found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, deleted })
}
