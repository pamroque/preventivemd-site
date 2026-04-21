# Supabase Setup Guide — PreventiveMD

## 1. Create Your Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / sign in
2. Click **New Project**
3. Settings:
   - **Organization**: Create one (e.g. "PreventiveMD")
   - **Project name**: `preventivemd`
   - **Database password**: Save this somewhere safe (you'll need it)
   - **Region**: Choose closest to your patients (e.g. `us-east-1`)
   - **Plan**: Start on **Free** for development, upgrade to **Team ($25/mo)** before going live (required for HIPAA BAA)
4. Wait ~2 minutes for the project to provision

## 2. Get Your API Keys

From the Supabase dashboard → **Settings → API**:

- **Project URL**: `https://<your-project-id>.supabase.co`
- **anon (public) key**: Used in the browser (safe to expose, RLS protects data)
- **service_role key**: Server-side only (NEVER expose to the browser)

## 3. Add Keys to Your Next.js App

Update `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## 4. Run the Migration

Option A — **Supabase Dashboard** (quickest):
1. Go to **SQL Editor** in the Supabase dashboard
2. Paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run**

Option B — **Supabase CLI** (recommended for ongoing development):
```bash
# Install the CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref <your-project-id>

# Run migrations
supabase db push
```

## 5. Install Supabase Client

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## 6. Enable Auth Features

In the Supabase dashboard → **Authentication → Providers**:

1. **Email**: Enable (this handles magic links)
2. Under **Email Templates**, customize the magic link email with PreventiveMD branding
3. Set the **Site URL** to your production domain: `https://preventivemd.com`
4. Add **Redirect URLs**:
   - `http://localhost:3000/**` (development)
   - `https://preventivemd.com/**` (production)

## 7. Enable Realtime (for messaging)

In the Supabase dashboard → **Database → Replication**:

1. Enable replication for the `messages` table
2. Enable replication for the `conversations` table (for status updates)

This powers live patient-provider and patient-support messaging via WebSocket subscriptions.

## 8. HIPAA Compliance (Before Launch)

Before handling real patient data:

1. Upgrade to **Team Plan** ($25/month minimum)
2. Go to **Settings → Security** and enable the **HIPAA add-on**
3. Sign the **Business Associate Agreement (BAA)**
4. Disable any non-compliant services you're not using
5. Enable **Point-in-Time Recovery** for the database

## Schema Overview

| Table | Purpose |
|-------|---------|
| `patients` | Core identity, linked to Supabase Auth |
| `providers` | Licensed providers with credentials |
| `intake_submissions` | Dynamic intake form data (JSONB responses) |
| `treatments` | Catalog of available treatments |
| `patient_treatments` | Patient ↔ treatment with status tracking |
| `appointments` | Sync/async consultation scheduling |
| `conversations` | Unified thread container (clinical + support) |
| `messages` | Individual messages within conversations |
| `prescriptions` | EHR bridge (gateway-agnostic) |
| `payments` | Payment records (gateway-agnostic) |
| `subscriptions` | Recurring billing (gateway-agnostic) |

## Key TypeScript File

All database types are defined in `src/lib/database.types.ts`. Use the `Database` type with the Supabase client for full type safety:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

## Next Steps

After setup, the following integrations will be wired in:
1. **Intake form submission** → writes to `intake_submissions` table
2. **Auth (magic links)** → creates `patients` record on signup
3. **Realtime messaging** → subscribes to `messages` table changes
4. **Payment webhooks** → API route handles gateway callbacks → writes to `payments`
5. **EHR integration** → Photon Health API → writes to `prescriptions`
