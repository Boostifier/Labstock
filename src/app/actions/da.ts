'use server'

import { supabase, getNextId } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

export async function getDemandes() {
  const { data, error } = await supabase
    .from('demandes_achat')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createDemande(formData: {
  reference_article: string
  designation: string
  categorie: string
  quantite: number
  unite: string
  fournisseur_suggere?: string
  urgence: string
  commentaire?: string
}) {
  const session = await getSession()
  if (!session?.droit_demande_achat && !session?.is_system) throw new Error('Accès refusé')

  const numero_da = await getNextId('da', 'DA')

  const { error } = await supabase.from('demandes_achat').insert({
    numero_da,
    ...formData,
    demandeur: session.nom,
    date_da: new Date().toISOString().split('T')[0],
    statut: 'En attente',
  })
  if (error) throw error
  revalidatePath('/demandes-achat')
  return numero_da
}

export async function updateDemande(numero_da: string, data: Partial<{
  reference_article: string
  designation: string
  categorie: string
  quantite: number
  unite: string
  fournisseur_suggere: string
  urgence: string
  commentaire: string
  statut: string
}>) {
  const session = await getSession()
  if (!session?.droit_demande_achat && !session?.is_system) throw new Error('Accès refusé')

  const { error } = await supabase.from('demandes_achat').update(data).eq('numero_da', numero_da)
  if (error) throw error
  revalidatePath('/demandes-achat')
}

export async function deleteDemande(numero_da: string) {
  const session = await getSession()
  if (!session?.droit_demande_achat && !session?.is_system) throw new Error('Accès refusé')

  const { error } = await supabase.from('demandes_achat').delete().eq('numero_da', numero_da)
  if (error) throw error
  revalidatePath('/demandes-achat')
}

export async function convertirEnBC(numero_da: string) {
  const session = await getSession()
  if (!session?.droit_bon_commande && !session?.is_system) throw new Error('Accès refusé')

  const { data: da } = await supabase.from('demandes_achat').select('*').eq('numero_da', numero_da).single()
  if (!da) throw new Error('DA introuvable')

  const numero_bc = await getNextId('bc', 'BC')

  await supabase.from('bons_commande').insert({
    numero_bc,
    fournisseur: da.fournisseur_suggere || '',
    date_bc: new Date().toISOString().split('T')[0],
    statut: 'En attente',
  })

  await supabase.from('details_bc').insert({
    numero_bc,
    reference: da.reference_article,
    designation: da.designation,
    quantite_commandee: da.quantite,
    prix_unitaire_ht: 0,
    tva_pct: 0,
    montant_ht: 0,
    quantite_recue: 0,
  })

  await supabase.from('demandes_achat').update({ statut: 'Converti en BC' }).eq('numero_da', numero_da)

  revalidatePath('/demandes-achat')
  revalidatePath('/bons-commande')
  return numero_bc
}
