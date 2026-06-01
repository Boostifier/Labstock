'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function getStock() {
  const { data, error } = await supabase
    .from('stock')
    .select('*')
    .order('reference')
    .order('date_peremption')
  if (error) throw error
  return data
}

export async function recalculerFEFO(reference: string) {
  const { data: lots, error } = await supabase
    .from('stock')
    .select('id, quantite_stock, date_peremption')
    .eq('reference', reference)
    .order('date_peremption')

  if (error || !lots) return

  let actifAssigne = false
  const updates: { id: string; statut_fefo: string }[] = []

  for (const lot of lots) {
    if (lot.quantite_stock <= 0) {
      updates.push({ id: lot.id, statut_fefo: 'Épuisé' })
    } else if (!actifAssigne) {
      updates.push({ id: lot.id, statut_fefo: 'Actif' })
      actifAssigne = true
    } else {
      updates.push({ id: lot.id, statut_fefo: 'Inactif' })
    }
  }

  for (const u of updates) {
    await supabase.from('stock').update({ statut_fefo: u.statut_fefo }).eq('id', u.id)
  }
}

export async function updateInventaireCumul(reference: string, designation: string, categorie: string, deltaEntrees: number, deltaSorties: number) {
  const { data: existing } = await supabase
    .from('inventaire')
    .select('cumul_entrees, cumul_sorties')
    .eq('reference', reference)
    .single()

  if (existing) {
    await supabase.from('inventaire').update({
      cumul_entrees: (existing.cumul_entrees || 0) + deltaEntrees,
      cumul_sorties: (existing.cumul_sorties || 0) + deltaSorties,
      updated_at: new Date().toISOString(),
    }).eq('reference', reference)
  } else {
    await supabase.from('inventaire').insert({
      reference,
      designation,
      categorie,
      cumul_entrees: deltaEntrees,
      cumul_sorties: deltaSorties,
    })
  }
}

export async function enregistrerSortie(data: {
  reference: string
  designation: string
  fournisseur: string
  categorie: string
  conditionnement: number
  numero_lot: string
  date_peremption: string
  quantite: number
  prix_unitaire: number
  motif: string
  operateur: string
}) {
  const { data: stockLot, error: stockErr } = await supabase
    .from('stock')
    .select('quantite_stock')
    .eq('reference', data.reference)
    .eq('numero_lot', data.numero_lot)
    .single()

  if (stockErr || !stockLot) throw new Error('Lot introuvable')
  if (stockLot.quantite_stock < data.quantite) throw new Error('Stock insuffisant')

  const newQty = stockLot.quantite_stock - data.quantite

  await supabase.from('stock').update({ quantite_stock: newQty })
    .eq('reference', data.reference)
    .eq('numero_lot', data.numero_lot)

  await supabase.from('sorties').insert({
    ...data,
    montant_total: data.quantite * data.prix_unitaire,
    date_sortie: new Date().toISOString().split('T')[0],
  })

  await recalculerFEFO(data.reference)
  await updateInventaireCumul(data.reference, data.designation, data.categorie, 0, data.quantite)

  revalidatePath('/operations')
  revalidatePath('/marchandises')
  revalidatePath('/dashboard')
}

export async function enregistrerEntree(data: {
  reference: string
  designation: string
  fournisseur: string
  categorie: string
  conditionnement: number
  numero_lot: string
  date_peremption: string
  quantite: number
  prix_unitaire: number
  operateur: string
  numero_bc?: string
}) {
  const { data: existing } = await supabase
    .from('stock')
    .select('id, quantite_stock')
    .eq('reference', data.reference)
    .eq('numero_lot', data.numero_lot)
    .single()

  if (existing) {
    await supabase.from('stock').update({
      quantite_stock: existing.quantite_stock + data.quantite,
    }).eq('id', existing.id)
  } else {
    await supabase.from('stock').insert({
      reference: data.reference,
      designation: data.designation,
      categorie: data.categorie,
      fournisseur: data.fournisseur,
      conditionnement: data.conditionnement,
      numero_lot: data.numero_lot,
      date_peremption: data.date_peremption,
      quantite_stock: data.quantite,
      prix_ht: data.prix_unitaire,
      prix_unitaire: data.prix_unitaire,
    })
  }

  await supabase.from('entrees').insert({
    ...data,
    montant_total: data.quantite * data.prix_unitaire,
    date_entree: new Date().toISOString().split('T')[0],
  })

  if (data.numero_bc) {
    const { data: detailBC } = await supabase
      .from('details_bc')
      .select('id, quantite_recue')
      .eq('numero_bc', data.numero_bc)
      .eq('reference', data.reference)
      .single()

    if (detailBC) {
      const newQtyRecue = (detailBC.quantite_recue || 0) + data.quantite
      await supabase.from('details_bc').update({ quantite_recue: newQtyRecue }).eq('id', detailBC.id)
    }
    await updateStatutBC(data.numero_bc)
  }

  await recalculerFEFO(data.reference)
  await updateInventaireCumul(data.reference, data.designation, data.categorie, data.quantite, 0)

  revalidatePath('/operations')
  revalidatePath('/marchandises')
  revalidatePath('/bons-commande')
  revalidatePath('/dashboard')
}

async function updateStatutBC(numero_bc: string) {
  const { data: details } = await supabase
    .from('details_bc')
    .select('quantite_commandee, quantite_recue')
    .eq('numero_bc', numero_bc)

  if (!details || details.length === 0) return

  const allDelivered = details.every(d => d.quantite_recue >= d.quantite_commandee)
  const anyDelivered = details.some(d => d.quantite_recue > 0)
  const statut = allDelivered ? 'Livré' : anyDelivered ? 'Partiel' : 'En attente'

  await supabase.from('bons_commande').update({ statut }).eq('numero_bc', numero_bc)
}

export async function getSorties() {
  const { data, error } = await supabase
    .from('sorties')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getEntrees() {
  const { data, error } = await supabase
    .from('entrees')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function annulerSortie(id: string) {
  const { data: sortie } = await supabase.from('sorties').select('*').eq('id', id).single()
  if (!sortie) throw new Error('Sortie introuvable')

  const { data: stockLot } = await supabase
    .from('stock')
    .select('quantite_stock')
    .eq('reference', sortie.reference)
    .eq('numero_lot', sortie.numero_lot)
    .single()

  if (stockLot) {
    await supabase.from('stock').update({
      quantite_stock: stockLot.quantite_stock + sortie.quantite
    }).eq('reference', sortie.reference).eq('numero_lot', sortie.numero_lot)
  }

  await supabase.from('sorties').delete().eq('id', id)
  await recalculerFEFO(sortie.reference)
  await updateInventaireCumul(sortie.reference, sortie.designation, sortie.categorie, 0, -sortie.quantite)

  revalidatePath('/operations')
  revalidatePath('/marchandises')
}
