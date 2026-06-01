import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseKey = (serviceKey && !serviceKey.startsWith('your_'))
    ? serviceKey
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  _client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })
  return _client
}

// Lazy proxy: the underlying client is only created on first property access
// (i.e. at request time), so `next build` page-data collection never triggers
// createClient() and won't crash if env vars are absent at build time.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
}) as SupabaseClient

export async function getNextId(name: string, prefix: string): Promise<string> {
  const { data, error } = await supabase
    .from('id_counters')
    .select('current_value')
    .eq('name', name)
    .single()

  if (error) throw error

  const nextVal = (data.current_value || 0) + 1

  await supabase
    .from('id_counters')
    .update({ current_value: nextVal })
    .eq('name', name)

  return `${prefix}-${String(nextVal).padStart(4, '0')}`
}
