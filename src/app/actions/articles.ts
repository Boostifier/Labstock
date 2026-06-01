'use server'

import { supabase, getNextId } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

export async function getArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('reference')
  if (error) throw error
  return data
}

export async function createArticle(formData: {
  designation: string
  conditionnement: number
  categorie: string
  prix_ht: number
  tva: number
}) {
  const session = await getSession()
  if (!session?.droit_parametres && !session?.is_system) throw new Error('Accès refusé')

  const reference = await getNextId('article', 'ART')
  const prix_ttc = formData.prix_ht * (1 + formData.tva / 100)

  const { error } = await supabase.from('articles').insert({
    reference,
    ...formData,
    prix_ttc: Math.round(prix_ttc * 1000) / 1000,
    date_creation: new Date().toISOString().split('T')[0],
  })
  if (error) throw error
  revalidatePath('/parametres')
  return reference
}

export async function updateArticle(reference: string, formData: {
  designation: string
  conditionnement: number
  categorie: string
  prix_ht: number
  tva: number
}) {
  const session = await getSession()
  if (!session?.droit_parametres && !session?.is_system) throw new Error('Accès refusé')

  const prix_ttc = formData.prix_ht * (1 + formData.tva / 100)

  const { error } = await supabase.from('articles').update({
    ...formData,
    prix_ttc: Math.round(prix_ttc * 1000) / 1000,
  }).eq('reference', reference)
  if (error) throw error
  revalidatePath('/parametres')
}

export async function deleteArticle(reference: string) {
  const session = await getSession()
  if (!session?.droit_parametres && !session?.is_system) throw new Error('Accès refusé')

  const { error } = await supabase.from('articles').delete().eq('reference', reference)
  if (error) throw error
  revalidatePath('/parametres')
}
