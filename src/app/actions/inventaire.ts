'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

export async function getInventaire() {
  const { data, error } = await supabase
    .from('inventaire')
    .select('*')
    .order('reference')
  if (error) throw error
  return data
}

export async function getAudits() {
  const { data, error } = await supabase
    .from('audit_inventaire')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function enregistrerAudit(items: Array<{
  reference: string
  designation: string
  numero_lot: string
  stock_systeme: number
  stock_physique: number
}>) {
  const session = await getSession()
  if (!session?.droit_inventaire && !session?.is_system) throw new Error('Accès refusé')

  const date_audit = new Date().toISOString().split('T')[0]
  const records = items.map(item => ({
    ...item,
    ecart: item.stock_physique - item.stock_systeme,
    operateur: session.nom,
    date_audit,
  }))

  const { error } = await supabase.from('audit_inventaire').insert(records)
  if (error) throw error
  revalidatePath('/inventaire')
}

export async function getStockParReference(reference: string) {
  const { data, error } = await supabase
    .from('stock')
    .select('*')
    .eq('reference', reference)
    .order('date_peremption')
  if (error) throw error
  return data
}
