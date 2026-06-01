'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

export async function getConfig() {
  const { data } = await supabase.from('config_labo').select('*').eq('id', 1).single()
  return data
}

export async function updateConfig(data: {
  nom_laboratoire: string
  adresse: string
  telephone: string
  email: string
}) {
  const session = await getSession()
  if (!session?.droit_parametres && !session?.is_system) throw new Error('Accès refusé')

  const { error } = await supabase.from('config_labo').upsert({ id: 1, ...data })
  if (error) throw error
  revalidatePath('/parametres')
}
