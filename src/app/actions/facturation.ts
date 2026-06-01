'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { getStatutDette } from '@/lib/utils'

export async function getFactures(type?: 'fournisseur' | 'sous_traitant') {
  let query = supabase.from('factures_entete').select('*').order('date_saisie', { ascending: false })
  if (type) query = query.eq('type_facture', type)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getFactureDetails(numero_facture: string) {
  const { data, error } = await supabase
    .from('factures_details')
    .select('*')
    .eq('numero_facture', numero_facture)
  if (error) throw error
  return data
}

export async function createFactureFournisseur(
  entete: Omit<{ numero_facture: string; date_facture: string; fournisseur: string; timbre: number; type_facture: string }, never>,
  details: Array<{ reference_article: string; designation: string; quantite: number; prix_unitaire: number; remise_pct: number; tva_pct: number }>
) {
  const session = await getSession()
  if (!session?.droit_facturation && !session?.is_system) throw new Error('Accès refusé')

  let total_ht = 0, total_remise = 0, total_tva = 0
  const detailsCalc = details.map(d => {
    const ht = d.quantite * d.prix_unitaire
    const remise = ht * d.remise_pct / 100
    const ht_net = ht - remise
    const tva = ht_net * d.tva_pct / 100
    total_ht += ht
    total_remise += remise
    total_tva += tva
    return { ...d, montant_ht_net: Math.round(ht_net * 1000) / 1000, numero_facture: entete.numero_facture }
  })

  const ht_net = total_ht - total_remise
  const total_ttc = ht_net + total_tva + (entete.timbre || 1)

  const { error: e1 } = await supabase.from('factures_entete').insert({
    ...entete,
    date_saisie: new Date().toISOString().split('T')[0],
    total_ht: Math.round(total_ht * 1000) / 1000,
    total_remise: Math.round(total_remise * 1000) / 1000,
    ht_net: Math.round(ht_net * 1000) / 1000,
    total_tva: Math.round(total_tva * 1000) / 1000,
    total_ttc: Math.round(total_ttc * 1000) / 1000,
  })
  if (e1) throw e1

  if (detailsCalc.length > 0) {
    const { error: e2 } = await supabase.from('factures_details').insert(detailsCalc)
    if (e2) throw e2
  }

  await supabase.from('dettes').insert({
    numero_facture: entete.numero_facture,
    date_facture: entete.date_facture,
    fournisseur: entete.fournisseur,
    categorie: entete.type_facture === 'sous_traitant' ? 'Sous-traitant' : 'Fournisseur',
    montant_a_payer: Math.round(total_ttc * 1000) / 1000,
    montant_paye: 0,
    date_echeance: entete.date_facture,
    statut: 'Non échue',
  })

  revalidatePath('/facturation')
}

export async function getDettes() {
  const { data, error } = await supabase
    .from('dettes')
    .select('*')
    .order('date_echeance')
  if (error) throw error

  return (data || []).map(d => {
    const solde = d.montant_a_payer - d.montant_paye
    const statut = getStatutDette(solde, d.date_echeance)
    return { ...d, solde, statut }
  })
}

export async function updateDette(id: string, data: { delai_jours: number; montant_paye: number }) {
  const session = await getSession()
  if (!session?.droit_facturation && !session?.is_system) throw new Error('Accès refusé')

  const { data: dette } = await supabase.from('dettes').select('*').eq('id', id).single()
  if (!dette) throw new Error('Dette introuvable')

  const solde = dette.montant_a_payer - data.montant_paye
  const statut = getStatutDette(solde, dette.date_echeance)

  const dateEcheance = new Date(dette.date_facture)
  dateEcheance.setDate(dateEcheance.getDate() + data.delai_jours)

  const { error } = await supabase.from('dettes').update({
    ...data,
    date_echeance: dateEcheance.toISOString().split('T')[0],
    statut,
  }).eq('id', id)
  if (error) throw error
  revalidatePath('/facturation')
}

export async function getReglements() {
  const { data, error } = await supabase
    .from('reglements')
    .select('*')
    .order('date_reglement', { ascending: false })
  if (error) throw error
  return data
}

export async function createReglement(data: {
  numero_facture: string
  date_reglement: string
  fournisseur: string
  montant_regle: number
  mode_paiement: string
  reference_paiement?: string
}) {
  const session = await getSession()
  if (!session?.droit_facturation && !session?.is_system) throw new Error('Accès refusé')

  const { error } = await supabase.from('reglements').insert(data)
  if (error) throw error

  const { data: dette } = await supabase
    .from('dettes')
    .select('montant_a_payer, montant_paye, date_facture, date_echeance')
    .eq('numero_facture', data.numero_facture)
    .single()

  if (dette) {
    const newPaye = dette.montant_paye + data.montant_regle
    const solde = dette.montant_a_payer - newPaye
    const statut = getStatutDette(solde, dette.date_echeance)
    await supabase.from('dettes').update({ montant_paye: newPaye, statut }).eq('numero_facture', data.numero_facture)
  }

  revalidatePath('/facturation')
}

export async function deleteFacture(numero_facture: string) {
  const session = await getSession()
  if (!session?.droit_facturation && !session?.is_system) throw new Error('Accès refusé')

  await supabase.from('dettes').delete().eq('numero_facture', numero_facture)
  await supabase.from('reglements').delete().eq('numero_facture', numero_facture)
  await supabase.from('factures_entete').delete().eq('numero_facture', numero_facture)
  revalidatePath('/facturation')
}
