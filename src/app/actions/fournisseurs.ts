'use server'

import { supabase, getNextId } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

export async function getFournisseurs() {
  const { data, error } = await supabase
    .from('fournisseurs')
    .select('*')
    .order('nom')
  if (error) throw error
  return data
}

export async function createFournisseur(formData: {
  nom: string
  adresse?: string
  code_postal?: string
  tel_fax?: string
  gsm?: string
  matricule_fiscal?: string
  email?: string
}) {
  const session = await getSession()
  if (!session?.droit_parametres && !session?.is_system) throw new Error('Accès refusé')

  const code = await getNextId('fournisseur', 'FOURN')
  const nomUpper = formData.nom.toUpperCase()
  const est_labo = nomUpper.includes('LABO') || nomUpper.includes('LABORATOIRE')

  const { error } = await supabase.from('fournisseurs').insert({
    code,
    ...formData,
    est_labo,
  })
  if (error) throw error
  revalidatePath('/parametres')
  return code
}

export async function updateFournisseur(code: string, formData: {
  nom: string
  adresse?: string
  code_postal?: string
  tel_fax?: string
  gsm?: string
  matricule_fiscal?: string
  email?: string
}) {
  const session = await getSession()
  if (!session?.droit_parametres && !session?.is_system) throw new Error('Accès refusé')

  const nomUpper = formData.nom.toUpperCase()
  const est_labo = nomUpper.includes('LABO') || nomUpper.includes('LABORATOIRE')

  const { error } = await supabase.from('fournisseurs').update({
    ...formData,
    est_labo,
  }).eq('code', code)
  if (error) throw error
  revalidatePath('/parametres')
}

export async function deleteFournisseur(code: string) {
  const session = await getSession()
  if (!session?.droit_parametres && !session?.is_system) throw new Error('Accès refusé')

  const { error } = await supabase.from('fournisseurs').delete().eq('code', code)
  if (error) throw error
  revalidatePath('/parametres')
}
