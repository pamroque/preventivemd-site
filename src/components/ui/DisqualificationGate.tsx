'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isIntakeDisqualified } from '@/lib/disqualification'

/**
 * DisqualificationGate
 *
 * Client-side guard that silently redirects a returning patient to
 * /get-started/questionnaire/disqualification when their saved answers
 * would disqualify them at step-11.
 *
 * Why: step-11 is where the disqualification decision is made before
 * routing to /visit-type. Without a downstream guard, a returning user
 * could bypass /disqualification by:
 *   • clicking through Reactivation (covered separately by
 *     `getResumeHref()` in /get-started/reactivation/page.tsx),
 *   • pasting / bookmarking a post-step-11 URL,
 *   • using browser back/forward to land on a later page.
 *
 * Mount once near the top of each post-step-11 page (visit-type,
 * choose-treatments, desired-treatments, choose-medications,
 * book-consultation, checkout). It must NOT be mounted on the
 * disqualification page itself — that would loop.
 *
 * The redirect uses `router.replace` so the protected page doesn't
 * pollute the browser history. There's a brief flash of the page's
 * markup before the effect runs (a known cost of client-side gating);
 * if that becomes a UX problem we can add a `null` skeleton or move
 * the check server-side (see "FUTURE: server-side gate" below).
 *
 * ─────────────────────────────────────────────────────────────────────
 * FUTURE: server-side gate via cookie + middleware
 * ─────────────────────────────────────────────────────────────────────
 *
 * The current gate runs after hydration, so a disqualified returning
 * user briefly sees the protected page (~50–150ms in prod) before the
 * `router.replace` lands. To eliminate the flash entirely we'd promote
 * the disqualification flag from sessionStorage to a cookie and gate
 * server-side. Sketch:
 *
 *   1) src/lib/disqualification.ts
 *      • Add `setDisqualifiedCookie()` and `clearDisqualifiedCookie()`
 *        helpers (use document.cookie on the client; HttpOnly is
 *        unnecessary because the value is non-secret).
 *      • Cookie name: `pmd_disqualified`, value `1`, `Path=/`,
 *        `SameSite=Lax`, no expiry (session cookie) so it dies with
 *        the tab.
 *
 *   2) step-11/page.tsx — when `isIntakeDisqualified()` is true at
 *      `handleSelect`, call `setDisqualifiedCookie()` before the
 *      `router.push(DISQUALIFICATION_STEP)`.
 *
 *   3) reactivation/page.tsx > clearSession path — the "Start over"
 *      handler calls `clearSession()`. Have it also call
 *      `clearDisqualifiedCookie()`. Same on /confirmation if you
 *      decide to also clear there.
 *
 *   4) src/middleware.ts (new file at the project root, peer of
 *      next.config.js)
 *
 *        import { NextResponse, type NextRequest } from 'next/server'
 *
 *        const PROTECTED = [
 *          '/get-started/questionnaire/visit-type',
 *          '/get-started/questionnaire/choose-treatments',
 *          '/get-started/questionnaire/desired-treatments',
 *          '/get-started/questionnaire/choose-medications',
 *          '/get-started/questionnaire/book-consultation',
 *          '/get-started/questionnaire/checkout',
 *        ]
 *
 *        export function middleware(req: NextRequest) {
 *          const dq = req.cookies.get('pmd_disqualified')?.value === '1'
 *          if (!dq) return NextResponse.next()
 *          return NextResponse.redirect(
 *            new URL('/get-started/questionnaire/disqualification', req.url),
 *          )
 *        }
 *
 *        export const config = {
 *          matcher: [
 *            '/get-started/questionnaire/visit-type',
 *            '/get-started/questionnaire/choose-treatments',
 *            '/get-started/questionnaire/desired-treatments',
 *            '/get-started/questionnaire/choose-medications',
 *            '/get-started/questionnaire/book-consultation',
 *            '/get-started/questionnaire/checkout',
 *          ],
 *        }
 *
 *      (PROTECTED can also be derived from `matcher` so they don't
 *      drift; the literal list above is just for clarity.)
 *
 *   5) Once the middleware is in place this <DisqualificationGate />
 *      component becomes belt-and-suspenders. You can either delete
 *      the mounts from each page (smaller bundle, slightly less
 *      defense-in-depth) or keep them for the rare cookie-disabled
 *      case. My vote: keep them, since they cost nothing.
 *
 * Caveats to remember when implementing:
 *   • `clearSession()` MUST clear the cookie too, or a user who hits
 *     "Start from the beginning" stays gated.
 *   • If the cookie ever drifts from sessionStorage (e.g. user clears
 *     site data but keeps cookies), the middleware would still redirect
 *     even though the local intake state was wiped. Consider also
 *     clearing the cookie on `/get-started/questionnaire` mount when
 *     no `firstName` is present in step 0.
 *   • Disqualification is mitigation, NEVER security. The authoritative
 *     check still belongs in `/api/intake` at submit time.
 *
 * Estimated effort: ~30–60 minutes of work + a quick QA pass.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function DisqualificationGate() {
  const router = useRouter()

  useEffect(() => {
    if (isIntakeDisqualified()) {
      router.replace('/get-started/questionnaire/disqualification')
    }
  }, [router])

  return null
}
