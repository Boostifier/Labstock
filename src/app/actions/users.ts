'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function getUsers() {
  const session = await getSession()
  if (!session?.is_system) throw new Error('Accès refusé')

  const { data, error } = await supabase
    .from('users')
    .select('id, nom, droit_parametres, droit_marchandises, droit_facturation, droit_operations, droit_inventaire, droit_demande_achat, droit_bon_commande, droit_satisfaction_f, droit_stock_bord, droit_factures_bord, is_system, created_at')
    .order('nom')
  if (error) throw error
  return data
}

export async function createUser(data: {
  nom: string
  mot_de_passe: string
  droit_parametres: boolean
  droit_marchandises: boolean
  droit_facturation: boolean
  droit_operations: boolean
  droit_inventaire: boolean
  droit_demande_achat: boolean
  droit_bon_commande: boolean
  droit_satisfaction_f: boolean
  droit_stock_bord: boolean
  droit_factures_bord: boolean
}) {
  const session = await getSession()
  if (!session?.is_system) throw new Error('Accès refusé')

  const hashed = await bcrypt.hash(data.mot_de_passe, 12)

  const { error } = await supabase.from('users').insert({
    ...data,
    mot_de_passe: hashed,
    is_system: false,
  })
  if (error) throw error
  revalidatePath('/utilisateurs')
}

export async function updateUser(id: string, data: {
  nom?: string
  mot_de_passe?: string
  droit_parametres?: boolean
  droit_marchandises?: boolean
  droit_facturation?: boolean
  droit_operations?: boolean
  droit_inventaire?: boolean
  droit_demande_achat?: boolean
  droit_bon_commande?: boolean
  droit_satisfaction_f?: boolean
  droit_stock_bord?: boolean
  droit_factures_bord?: boolean
}) {
  const session = await getSession()
  if (!session?.is_system) throw new Error('Accès refusé')

  const { data: user } = await supabase.from('users').select('is_system').eq('id', id).single()
  if (user?.is_system) throw new Error('Le compte système ne peut pas être modifié')

  const updateData: Record<string, unknown> = { ...data }
  if (data.mot_de_passe) {
    updateData.mot_de_passe = await bcrypt.hash(data.mot_de_passe, 12)
  } else {
    delete updateData.mot_de_passe
  }

  const { error } = await supabase.from('users').update(updateData).eq('id', id)
  if (error) throw error
  revalidatePath('/utilisateurs')
}

export async function deleteUser(id: string) {
  const session = await getSession()
  if (!session?.is_system) throw new Error('Accès refusé')

  const { data: user } = await supabase.from('users').select('is_system').eq('id', id).single()
  if (user?.is_system) throw new Error('Le compte système ne peut pas être supprimé')

  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/utilisateurs')
}
