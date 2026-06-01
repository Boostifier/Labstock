import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseKey = (serviceKey && !serviceKey.startsWith('your_'))
  ? serviceKey
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

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
