/**
 * /api/admin/cleanup-holds — sweep expired provisional_appointments
 *
 * Deletes rows where expires_at <= now(). Idempotent. Cheap (one DELETE
 * with an indexed WHERE). Runs every 10 minutes via Vercel cron, also
 * callable on demand for ops cleanup.
 *
 * Why we need this: the unique index on (vendor, provider, slot) is NOT
 * a partial index gated on expires_at — Postgres rejects now() in index
 * predicates. So an unswept expired hold blocks future bookings of the
 * same slot. The reserve endpoint sweeps per-slot before INSERT, but
 * this cron keeps the table small overall.
 *
 * Auth: same pattern as /api/sync/run — accepts CRON_SECRET (Vercel cron)
 * or SYNC_WORKER_TOKEN (manual / smoke).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest)  { return run(req) }
export async function POST(req: NextRequest) { return run(req) }

async function run(req: NextRequest) {
  const cronSecret  = process.env.CRON_SECRET
  const workerToken = process.env.SYNC_WORKER_TOKEN
  if (!cronSecret && !workerToken) {
    return NextResponse.json(
      { ok: false, error: 'Neither CRON_SECRET nor SYNC_WORKER_TOKEN configured' },
      { status: 500 },
    )
  }
  const auth = req.headers.get('authorization') ?? ''
  const valid =
    (!!cronSecret  && auth === `Bearer ${cronSecret}`) ||
    (!!workerToken && auth === `Bearer ${workerToken}`)
  if (!valid) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const cutoff = new Date().toISOString()

  // .select('id') so we get a count back. The cleanup itself is unaffected.
  const { data, error } = await supabase
    .from('provisional_appointments')
    .delete()
    .lte('expires_at', cutoff)
    .select('id')

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'cleanup_failed', detail: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    deleted: data?.length ?? 0,
    cutoff,
  })
}
