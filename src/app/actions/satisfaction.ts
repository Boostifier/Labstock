'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

export async function getEvaluations() {
  const { data, error } = await supabase
    .from('satisfaction_fournisseur')
    .select('*')
    .order('date_evaluation', { ascending: false })
  if (error) throw error
  return data
}

export async function createEvaluation(data: {
  fournisseur: string
  reference_bc_facture?: string
  note_delais: number
  note_qualite: number
  note_conformite: number
  note_service: number
  note_prix: number
  commentaire?: string
}) {
  const session = await getSession()
  if (!session?.droit_satisfaction_f && !session?.is_system) throw new Error('Accès refusé')

  const note_globale = (data.note_delais + data.note_qualite + data.note_conformite + data.note_service + data.note_prix) / 5

  const { error } = await supabase.from('satisfaction_fournisseur').insert({
    ...data,
    note_globale: Math.round(note_globale * 100) / 100,
    date_evaluation: new Date().toISOString().split('T')[0],
  })
  if (error) throw error
  revalidatePath('/satisfaction')
}

export async function deleteEvaluation(id: string) {
  const session = await getSession()
  if (!session?.droit_satisfaction_f && !session?.is_system) throw new Error('Accès refusé')

  const { error } = await supabase.from('satisfaction_fournisseur').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/satisfaction')
}

export async function getMoyenneParFournisseur() {
  const { data, error } = await supabase
    .from('satisfaction_fournisseur')
    .select('fournisseur, note_delais, note_qualite, note_conformite, note_service, note_prix, note_globale')

  if (error) throw error

  const grouped: Record<string, {
    nom: string
    count: number
    delais: number
    qualite: number
    conformite: number
    service: number
    prix: number
    globale: number
  }> = {}

  for (const e of data || []) {
    if (!grouped[e.fournisseur]) {
      grouped[e.fournisseur] = {
        nom: e.fournisseur,
        count: 0,
        delais: 0,
        qualite: 0,
        conformite: 0,
        service: 0,
        prix: 0,
        globale: 0,
      }
    }
    grouped[e.fournisseur].count++
    grouped[e.fournisseur].delais += e.note_delais
    grouped[e.fournisseur].qualite += e.note_qualite
    grouped[e.fournisseur].conformite += e.note_conformite
    grouped[e.fournisseur].service += e.note_service
    grouped[e.fournisseur].prix += e.note_prix
    grouped[e.fournisseur].globale += e.note_globale
  }

  return Object.entries(grouped).map(([code, v]) => ({
    code,
    nom: v.nom,
    count: v.count,
    note_delais: Math.round((v.delais / v.count) * 10) / 10,
    note_qualite: Math.round((v.qualite / v.count) * 10) / 10,
    note_conformite: Math.round((v.conformite / v.count) * 10) / 10,
    note_service: Math.round((v.service / v.count) * 10) / 10,
    note_prix: Math.round((v.prix / v.count) * 10) / 10,
    note_globale: Math.round((v.globale / v.count) * 10) / 10,
  }))
}
