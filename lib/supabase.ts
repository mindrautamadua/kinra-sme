import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const COOKIE_SESI = 'kinra_sesi'

/** Klien server. Token sesi dikirim di header `x-sesi`; RLS di database membaca peran dari token ini. */
export async function db(token?: string): Promise<SupabaseClient> {
  const t = token ?? (await cookies()).get(COOKIE_SESI)?.value
  return createClient(URL_SB, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: t ? { 'x-sesi': t } : {} },
  })
}
