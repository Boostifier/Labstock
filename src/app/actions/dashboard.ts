'use server'

import { supabase } from '@/lib/supabase'

export async function getDashboardData() {
  const now = new Date()
  const moisDebut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const moisFin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [stockResult, sortiesResult, entreesResult, alertesResult] = await Promise.all([
    supabase.from('stock').select('quantite_stock, prix_unitaire, statut_fefo, date_peremption, reference, designation, numero_lot'),
    supabase.from('sorties').select('quantite').gte('date_sortie', moisDebut).lte('date_sortie', moisFin),
    supabase.from('entrees').select('quantite').gte('date_entree', moisDebut).lte('date_entree', moisFin),
    supabase.from('stock').select('reference, designation, numero_lot, quantite_stock, statut_fefo, date_peremption').lte('quantite_stock', 5),
  ])

  const stock = stockResult.data || []
  const sorties = sortiesResult.data || []
  const entrees = entreesResult.data || []
  const alertesStock = alertesResult.data || []

  const valeur_stock = stock.reduce((sum, l) => sum + (l.quantite_stock * l.prix_unitaire), 0)
  const total_lots = stock.length
  const refs = new Set(stock.map(l => l.reference))
  const total_references = refs.size

  const ruptures = stock.filter(l => l.quantite_stock <= 0).length
  const alertes = stock.filter(l => l.quantite_stock > 0 && l.quantite_stock < 5).length
  const lots_sains = stock.filter(l => l.quantite_stock >= 5 && l.quantite_stock <= 500).length
  const surstock = stock.filter(l => l.quantite_stock > 500).length

  const sorties_mois = sorties.reduce((s, r) => s + (r.quantite || 0), 0)
  const entrees_mois = entrees.reduce((s, r) => s + (r.quantite || 0), 0)

  const actifs = stock.filter(l => l.statut_fefo === 'Actif').length
  const inactifs = stock.filter(l => l.statut_fefo === 'Inactif').length
  const epuises = stock.filter(l => l.statut_fefo === 'Épuisé').length

  const today = now.toISOString().split('T')[0]
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const alertesList = alertesStock.map(l => {
    let type = 'FAIBLE', niveau = 'ALERTE'
    if (l.quantite_stock <= 0) { type = 'RUPTURE'; niveau = 'CRITIQUE' }
    else if (l.date_peremption && l.date_peremption < today) { type = 'PERIME'; niveau = 'CRITIQUE' }
    else if (l.date_peremption && l.date_peremption <= in30) { type = 'PERIM.BIENTOT'; niveau = 'ALERTE' }
    return { type, niveau, reference: l.reference, designation: l.designation, lot: l.numero_lot }
  })

  const [dernSorties, dernEntrees] = await Promise.all([
    supabase.from('sorties').select('date_sortie, reference, designation, quantite').order('created_at', { ascending: false }).limit(5),
    supabase.from('entrees').select('date_entree, reference, designation, quantite').order('created_at', { ascending: false }).limit(5),
  ])

  const [top5, evolution] = await Promise.all([
    supabase.from('sorties').select('reference, designation, quantite').order('quantite', { ascending: false }),
    Promise.resolve([]),
  ])

  const top5grouped: Record<string, { designation: string; total: number }> = {}
  for (const s of top5.data || []) {
    if (!top5grouped[s.reference]) top5grouped[s.reference] = { designation: s.designation, total: 0 }
    top5grouped[s.reference].total += s.quantite
  }
  const top5list = Object.entries(top5grouped)
    .map(([ref, v]) => ({ reference: ref, designation: v.designation, total: v.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const stockParCategorie: Record<string, number> = {}
  for (const l of stock) {
    if (l.quantite_stock > 0) {
      stockParCategorie[l.reference] = (stockParCategorie[l.reference] || 0) + l.quantite_stock
    }
  }

  return {
    kpis: { valeur_stock, total_lots, total_references, sorties_mois, entrees_mois, ruptures, alertes, lots_sains, surstock },
    fefo: { actifs, inactifs, epuises },
    alertesList: alertesList.sort((a, b) => a.niveau === 'CRITIQUE' ? -1 : 1).slice(0, 20),
    dernSorties: (dernSorties.data || []).map(s => ({ type: 'SORTIE', date: s.date_sortie, article: s.designation, quantite: s.quantite })),
    dernEntrees: (dernEntrees.data || []).map(e => ({ type: 'ENTREE', date: e.date_entree, article: e.designation, quantite: e.quantite })),
    top5: top5list,
  }
}

export async function getEvolutionMensuelle() {
  const months = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      debut: d.toISOString().split('T')[0],
      fin: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
    })
  }

  const result = await Promise.all(months.map(async m => {
    const [s, e] = await Promise.all([
      supabase.from('sorties').select('quantite').gte('date_sortie', m.debut).lte('date_sortie', m.fin),
      supabase.from('entrees').select('quantite').gte('date_entree', m.debut).lte('date_entree', m.fin),
    ])
    return {
      mois: m.label,
      sorties: (s.data || []).reduce((sum, r) => sum + r.quantite, 0),
      entrees: (e.data || []).reduce((sum, r) => sum + r.quantite, 0),
    }
  }))

  return result
}
