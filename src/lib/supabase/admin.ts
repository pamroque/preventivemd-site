/**
 * supabase/admin.ts — Admin Supabase client (service role)
 *
 * Use this ONLY in server-side code (API routes, Server Actions).
 * Bypasses RLS — use for admin operations like creating patient
 * records during intake submission before the user has auth.
 *
 * NEVER import this in client components or expose the service role key.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
