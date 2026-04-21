/**
 * supabase/client.ts — Browser-side Supabase client
 *
 * Use this in Client Components ('use client').
 * Creates a singleton client using the anon key.
 * RLS policies protect data — the anon key is safe to expose.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
