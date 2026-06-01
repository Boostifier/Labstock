'use client'

import { useState } from 'react'
import { StockLot, Article, Fournisseur } from '@/types'
import { formatCurrency, formatDate, isExpired, expiresWithin30Days, fefoColor } from '@/lib/utils'

function StockBadge({ quantite }: { quantite: number }) {
  if (quantite <= 0) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rupture</span>
  if (quantite < 5) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">{quantite}</span>
  if (quantite > 500) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{quantite}</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{quantite}</span>
}

function PeremptionBadge({ date }: { date: string }) {
  if (!date) return <span className="text-slate-400">—</span>
  if (isExpired(date)) return <span className="text-red-600 font-medium text-xs">{formatDate(date)} ⚠ PÉRIMÉ</span>
  if (expiresWithin30Days(date)) return <span className="text-amber-600 font-medium text-xs">{formatDate(date)} ⚠</span>
  return <span className="text-sm">{formatDate(date)}</span>
}

export default function MarchandisesClient({
  initialStock, articles, fournisseurs
}: {
  initialStock: StockLot[]
  articles: Article[]
  fournisseurs: Fournisseur[]
}) {
  const [stock] = useState(initialStock)
  const [search, setSearch] = useState('')
  const [filterCategorie, setFilterCategorie] = useState('')
  const [filterFournisseur, setFilterFournisseur] = useState('')
  const [filterFEFO, setFilterFEFO] = useState('')
  const [showRuptures, setShowRuptures] = useState(false)
  const [showPerimes, setShowPerimes] = useState(false)
  const [selectedRef, setSelectedRef] = useState<string | null>(null)

  const categories = [...new Set(stock.map(s => s.categorie).filter(Boolean))]
  const fournisseursCodes = [...new Set(stock.map(s => s.fournisseur).filter(Boolean))]

  const filtered = stock.filter(s => {
    const matchSearch = !search || s.reference.toLowerCase().includes(search.toLowerCase()) || s.designation.toLowerCase().includes(search.toLowerCase())
    const matchCategorie = !filterCategorie || s.categorie === filterCategorie
    const matchFourn = !filterFournisseur || s.fournisseur === filterFournisseur
    const matchFEFO = !filterFEFO || s.statut_fefo === filterFEFO
    const matchRupture = !showRuptures || s.quantite_stock <= 0
    const matchPerime = !showPerimes || isExpired(s.date_peremption)
    return matchSearch && matchCategorie && matchFourn && matchFEFO && matchRupture && matchPerime
  })

  const fournNomMap = fournisseurs.reduce((m, f) => { m[f.code] = f.nom; return m }, {} as Record<string, string>)

  const selectedLots = selectedRef ? stock.filter(s => s.reference === selectedRef) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Marchandises & Stock</h1>
        <div className="text-sm text-slate-500">{filtered.length} lots affichés</div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher référence / désignation..." className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Toutes catégories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterFournisseur} onChange={e => setFilterFournisseur(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tous fournisseurs</option>
            {fournisseursCodes.map(c => <option key={c} value={c}>{fournNomMap[c] || c}</option>)}
          </select>
          <select value={filterFEFO} onChange={e => setFilterFEFO(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Statut FEFO</option>
            <option value="Actif">Actif</option>
            <option value="Inactif">Inactif</option>
            <option value="Épuisé">Épuisé</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showRuptures} onChange={e => setShowRuptures(e.target.checked)} className="rounded" />
            Ruptures seulement
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showPerimes} onChange={e => setShowPerimes(e.target.checked)} className="rounded" />
            Périmés seulement
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Référence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Désignation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Catégorie</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fournisseur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Lot</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Péremption</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Prix U.</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">FEFO</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => (
                <tr key={s.id} className={`hover:bg-slate-50 ${s.quantite_stock <= 0 ? 'bg-red-50/30' : isExpired(s.date_peremption) ? 'bg-red-50/20' : expiresWithin30Days(s.date_peremption) ? 'bg-amber-50/20' : ''}`}>
                  <td className="px-4 py-3 font-mono text-blue-600 text-xs whitespace-nowrap">{s.reference}</td>
                  <td className="px-4 py-3 font-medium max-w-xs">
                    <div className="truncate">{s.designation}</div>
                    <div className="text-xs text-slate-400">Cond. {s.conditionnement}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded whitespace-nowrap">{s.categorie}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{fournNomMap[s.fournisseur] || s.fournisseur}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.numero_lot}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><PeremptionBadge date={s.date_peremption} /></td>
                  <td className="px-4 py-3 text-center"><StockBadge quantite={s.quantite_stock} /></td>
                  <td className="px-4 py-3 text-right text-xs">{formatCurrency(s.prix_unitaire)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fefoColor(s.statut_fefo)}`}>{s.statut_fefo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedRef(selectedRef === s.reference ? null : s.reference)}
                      className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded whitespace-nowrap">
                      {selectedRef === s.reference ? '▲ Détails' : '▼ Détails'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun article dans le stock</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selectedRef && selectedLots.length > 0 && (
        <div className="mt-4 bg-blue-50 rounded-xl border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            Tous les lots — {selectedLots[0]?.designation} ({selectedRef})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-blue-700">
                  <th className="text-left pb-2 pr-4">Lot</th>
                  <th className="text-left pb-2 pr-4">Péremption</th>
                  <th className="text-right pb-2 pr-4">Stock</th>
                  <th className="text-right pb-2 pr-4">Valeur</th>
                  <th className="text-center pb-2">FEFO</th>
                </tr>
              </thead>
              <tbody>
                {selectedLots.map(l => (
                  <tr key={l.id} className="border-t border-blue-100">
                    <td className="py-2 pr-4 font-mono text-xs">{l.numero_lot}</td>
                    <td className="py-2 pr-4"><PeremptionBadge date={l.date_peremption} /></td>
                    <td className="py-2 pr-4 text-right font-semibold">{l.quantite_stock}</td>
                    <td className="py-2 pr-4 text-right text-xs">{formatCurrency(l.quantite_stock * l.prix_unitaire)}</td>
                    <td className="py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fefoColor(l.statut_fefo)}`}>{l.statut_fefo}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
