# Payments — Stripe Integration Runbook

How payments work in this codebase, how to develop against them, and how to operate them in production.

> **Status:** Step 1 (sync $35 video consult) shipped. Step 2 (async subscriptions) and Step 3 (post-visit Treatment Plan magic-link flow) are deferred. See `PROJECT-TRACKER.md` for the broader roadmap.

---

## Architecture

### Two patient flows, one Stripe Customer per patient

| Flow | What the patient pays for | Stripe primitive | Card saved? |
|---|---|---|---|
| **Sync (live consult)** | $35 video consultation fee, one-time | Checkout Session, `mode: payment` | Yes — via `setup_future_usage: 'off_session'` |
| **Async (menu)** | Per-treatment subscription with a chosen term | Checkout Session, `mode: subscription` | Yes (subscription default) |

The same patient can flow through either. We always reuse a single Stripe Customer per patient (stored in `patients.gateway_customer_ids.stripe`) so saved cards persist across sessions.

### Why we save cards even on the $35 visit

Step 3 of the product (post-visit Treatment Plan authorization) is built on top of the saved card. After the sync visit, the clinician selects prescribed treatments in Healthie, the patient gets a magic-link approval page, and a single click spins up a Stripe Subscription against the *already-saved* card. No re-entry of payment info.

### Gateway-agnostic schema

The Supabase schema (migrations 001 + 007) keeps payment data gateway-agnostic. There are no `stripe_*` columns on `payments` or `subscriptions` — instead, we use the existing `gateway`, `gateway_payment_id`, `gateway_customer_id`, `gateway_subscription_id`, and `gateway_metadata` (JSONB) columns. If we ever add Square or Helcim, no migration needed.

---

## File map

```
src/lib/stripe/
├── client.ts              # Server-only Stripe SDK initializer
├── customer.ts            # getOrCreateStripeCustomer — one Customer per patient
└── webhook-handlers.ts    # Pure, idempotent handlers per event type

src/app/api/checkout/session/
└── route.ts               # POST — create a Stripe Checkout Session

src/app/api/stripe/webhook/
└── route.ts               # POST — receive Stripe webhook events

supabase/migrations/
└── 007_payment_integration.sql   # patients/treatments/subscriptions extensions + stripe_events
```

The frontend wiring lives in `src/app/get-started/questionnaire/checkout/page.tsx` — the existing checkout page. On submit, sync flows redirect to Stripe-hosted checkout; async flows currently fall through to the confirmation page (Step 2 work).

---

## Environment variables

In `.env.local` for development. In Vercel project settings for production.

```env
# Stripe API keys (server-side and publishable)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...    # or pk_live_ in production
STRIPE_SECRET_KEY=sk_test_...                      # or sk_live_ in production

# Webhook signing secret — issued per endpoint by Stripe
# Local dev: from `stripe listen` output (whsec_...)
# Production: from Stripe Dashboard → Developers → Webhooks → [endpoint] → Signing secret
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs — different in test mode vs. live mode
STRIPE_PRICE_SYNC_VISIT_FEE=price_...
```

The Price ID will differ between test and live modes — Stripe creates a fresh Price ID per environment when you create the Product in each. **Don't reuse a test-mode Price ID in production.**

---

## Local development setup

You need three terminals.

### 1. Dev server
```bash
cd outputs/preventivemd-site
npm run dev
```

### 2. Stripe CLI listener
```bash
# Install once
brew install stripe/stripe-cli/stripe
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints a signing secret on startup:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxx
```

Paste that into `.env.local` as `STRIPE_WEBHOOK_SECRET` and restart the dev server (env vars only load on startup).

### 3. Triggering events (optional, for unit-testing handlers)
```bash
stripe trigger checkout.session.completed
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

For an end-to-end test, just walk through the questionnaire in the browser using a state from `SYNC_REQUIRED_STATES_SET` (e.g., Florida) to force the sync path. At the Stripe Checkout page use card `4242 4242 4242 4242`, any future expiry, any CVC, any zip.

### Test cards reference
| Number | Behavior |
|---|---|
| `4242 4242 4242 4242` | Success |
| `4000 0025 0000 3155` | Requires 3DS authentication |
| `4000 0000 0000 9995` | Insufficient funds (decline) |
| `4000 0000 0000 0002` | Generic decline |

Full list: https://stripe.com/docs/testing#cards

---

## Production setup

### 1. Stripe verification
Account verification (EIN, bank account, KYC) must be complete before live-mode payments will settle. See "Action required" on Stripe Dashboard home if pending.

### 2. Live-mode Products
Recreate every Product and Price in **live mode** (toggle in Stripe Dashboard top-left). Lookup keys are the bridge — keep them stable across modes (`sync_visit_fee`, etc.) so the code reads the same in both environments.

### 3. Webhook endpoint
- Stripe Dashboard → Developers → Webhooks → **Add endpoint**
- URL: `https://preventivemd.com/api/stripe/webhook`
- Events to subscribe to:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - (Subscription events to be added when Step 2 ships)
- After saving, click into the endpoint and copy the **Signing secret** to Vercel as `STRIPE_WEBHOOK_SECRET`

### 4. Vercel env vars
Set in Vercel project settings (NOT in committed files):
- `STRIPE_SECRET_KEY` — `sk_live_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — `pk_live_...`
- `STRIPE_WEBHOOK_SECRET` — `whsec_...` (live endpoint)
- `STRIPE_PRICE_SYNC_VISIT_FEE` — `price_...` (live mode)

### 5. Stripe Tax + Radar
- Stripe Dashboard → Settings → Tax → toggle on
- Radar is on by default; verify in Radar → Rules

---

## Schema overview (migration 007)

### Modifications to existing tables
- `patients.gateway_customer_ids JSONB` — `{ "stripe": "cus_xxx" }`. Lookup before every Stripe operation.
- `treatments.gateway_prices JSONB` — `{ "stripe": { "monthly": "price_xxx", ... } }`. Populated when async products land.
- `subscriptions.gateway_price_id TEXT` — denormalized for reporting.

### New table: `stripe_events`
Webhook idempotency. PRIMARY KEY on Stripe event ID. Service-role-only (RLS enabled, no policies, REVOKE'd from anon/authenticated).

```sql
CREATE TABLE stripe_events (
  id            TEXT PRIMARY KEY,         -- evt_xxx
  type          TEXT NOT NULL,
  livemode      BOOLEAN NOT NULL,
  api_version   TEXT,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ,              -- NULL = unprocessed; set on success
  payload       JSONB NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT
);
```

---

## Common operations

### Issue a refund (manual)
1. Stripe Dashboard → Payments → find the charge
2. Click **Refund payment** → enter amount → Submit
3. Stripe fires `charge.refunded` → our webhook updates the `payments` row to `status='refunded'` (or `partially_refunded`) and sets `refund_amount_cents` + `refunded_at`.

No code change needed — the webhook handler does the rest.

### Look up a patient's payment history
```sql
SELECT
  p.amount_cents / 100.0 AS amount_usd,
  p.status,
  p.type,
  p.description,
  p.paid_at,
  p.gateway_payment_id   -- the Stripe PaymentIntent ID after success
FROM payments p
JOIN patients pat ON pat.id = p.patient_id
WHERE pat.email = 'patient@example.com'
ORDER BY p.created_at DESC;
```

### Find a patient's Stripe Customer ID
```sql
SELECT
  email,
  gateway_customer_ids->>'stripe' AS stripe_customer_id
FROM patients
WHERE email = 'patient@example.com';
```

Then in Stripe Dashboard, paste the `cus_xxx` into the search bar.

### Replay a failed webhook
1. Find the event in Stripe Dashboard → Developers → Events
2. Click into it → click **Resend** to redeliver
3. Our route detects the duplicate event ID, sees `processed_at IS NULL` (because it failed before), and re-runs the handler.

Alternatively, for ops:
```sql
-- Inspect failed events
SELECT id, type, last_error, attempts, received_at
FROM stripe_events
WHERE processed_at IS NULL
ORDER BY received_at DESC;
```

---

## Webhook event handling

Each handler is pure: takes `(supabase, event payload)`, writes to `payments`, throws on unrecoverable error. Idempotency is layered:

1. **Route layer**: dedupes on `stripe_events.id` (Stripe event ID). Duplicate deliveries with `processed_at` set return 200 immediately.
2. **Handler layer**: each handler checks current row state before writing (`if (payment.status === 'succeeded') return`). Even if the dedupe layer is bypassed, handlers are safe to run twice.

### Event coverage (Step 1)
| Event | Action |
|---|---|
| `checkout.session.completed` | Promote `payments` row from `pending` → `succeeded`. Pivot `gateway_payment_id` from Session ID to PaymentIntent ID (so future events can find the row). |
| `payment_intent.succeeded` | Defensive backfill. No-op if row already succeeded. |
| `payment_intent.payment_failed` | Mark `failed`, capture decline reason. |
| `charge.refunded` | Mark `refunded` or `partially_refunded` based on cumulative `amount_refunded`. |

### Coverage gaps (Step 2 / Step 3 work)
- `customer.subscription.created` / `updated` / `deleted` — Step 2
- `invoice.payment_succeeded` / `payment_failed` — Step 2
- `charge.dispute.created` — operational, defer

Any unhandled event type is acknowledged (200 returned, marked processed) so Stripe stops retrying. Add a case in the dispatch when you need it.

---

## Security checklist

- ✅ Signature verification on every webhook delivery — forged events return 400.
- ✅ `STRIPE_SECRET_KEY` is server-only; never exposed to client.
- ✅ `STRIPE_WEBHOOK_SECRET` is server-only.
- ✅ `stripe_events` table is service-role-only (REVOKE'd from anon/authenticated).
- ✅ Webhook route is `runtime: 'nodejs'` (not Edge — Edge crypto polyfills are weaker).
- ✅ `idempotencyKey` on every Checkout Session create — double-clicks don't double-charge.
- ⬜ Move EHR sync job to fire after `checkout.session.completed` (currently fires synchronously on `/api/intake`, which can leave a Healthie appointment without payment if patient abandons Stripe). Tracked separately.

---

## Step 2 (subscriptions) and Step 3 (Treatment Plan) — what's missing

For the team picking this up next:

1. **Async pricing strategy** — see `PROJECT-TRACKER.md` Task #19. Locks in formulation handling, term-discount mechanics, bundle approach, promo code strategy.
2. **Async products in Stripe** — Task #20, depends on #19. ~12 Products × 4 prices each.
3. **`/api/checkout/session` async mode** — extend the existing route to handle `mode: 'async_subscription'` with `cart: [{treatment_slug, term}]`. Resolve each cart item via `treatments.gateway_prices`.
4. **Subscription webhook handlers** — `customer.subscription.*`, `invoice.*`. Pattern same as Step 1 handlers.
5. **Treatment Plan flow** — `treatment_plans` table, magic-link page in `(portal)`, Healthie webhook integration. See Tasks #12, #13, #17, #18.

---

## Decision log

Decisions worth knowing for context:

- **Stripe over Paddle / Lemon Squeezy** — MoR pattern is incompatible with HSA/FSA acceptance and awkward fit for medical services. See `Payment_Processor_Decision_Memo.docx` for full rationale.
- **Auto-renewing subscriptions over prepaid courses** — matches industry norm (Hims, Ro, Hers); better LTV.
- **Card-save on $35 visit via `setup_future_usage`** — required so Step 3 can charge the saved card off-session without re-asking.
- **Gateway-agnostic schema** — preserves optionality if Stripe relationship sours.
- **Service-role-only `stripe_events` table** — same RLS posture as `ehr_sync_jobs`; payment metadata is sensitive.
