'use server'

import { supabase, getNextId } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

export async function getBonsCommande() {
  const { data, error } = await supabase
    .from('bons_commande')
    .select('*')
    .order('date_bc', { ascending: false })
  if (error) throw error
  return data
}

export async function getDetailBC(numero_bc: string) {
  const { data, error } = await supabase
    .from('details_bc')
    .select('*')
    .eq('numero_bc', numero_bc)
  if (error) throw error
  return data
}

export async function createBC(
  entete: { fournisseur: string; conditions_paiement?: string; delai_livraison?: string },
  details: Array<{ reference: string; designation: string; conditionnement?: number; quantite_commandee: number; prix_unitaire_ht: number; tva_pct: number }>
) {
  const session = await getSession()
  if (!session?.droit_bon_commande && !session?.is_system) throw new Error('Accès refusé')

  const numero_bc = await getNextId('bc', 'BC')

  const { error: e1 } = await supabase.from('bons_commande').insert({
    numero_bc,
    ...entete,
    date_bc: new Date().toISOString().split('T')[0],
    statut: 'En attente',
  })
  if (e1) throw e1

  const detailsWithBC = details.map(d => ({
    ...d,
    numero_bc,
    montant_ht: Math.round(d.quantite_commandee * d.prix_unitaire_ht * 1000) / 1000,
    quantite_recue: 0,
    conditionnement: d.conditionnement || 1,
  }))

  const { error: e2 } = await supabase.from('details_bc').insert(detailsWithBC)
  if (e2) throw e2

  revalidatePath('/bons-commande')
  return numero_bc
}

export async function updateBC(numero_bc: string, data: Partial<{
  fournisseur: string
  conditions_paiement: string
  delai_livraison: string
  statut: string
}>) {
  const session = await getSession()
  if (!session?.droit_bon_commande && !session?.is_system) throw new Error('Accès refusé')

  const { error } = await supabase.from('bons_commande').update(data).eq('numero_bc', numero_bc)
  if (error) throw error
  revalidatePath('/bons-commande')
}

export async function deleteBC(numero_bc: string) {
  const session = await getSession()
  if (!session?.droit_bon_commande && !session?.is_system) throw new Error('Accès refusé')

  await supabase.from('details_bc').delete().eq('numero_bc', numero_bc)
  await supabase.from('bons_commande').delete().eq('numero_bc', numero_bc)
  revalidatePath('/bons-commande')
}
