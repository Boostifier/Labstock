'use client'

import { useState, useTransition, Fragment } from 'react'
import { BonCommande, DetailBC, Article, Fournisseur, TVA_RATES, STATUTS_BC } from '@/types'
import { formatCurrency, formatDate, statutBCColor } from '@/lib/utils'
import { createBC, updateBC, deleteBC, getBonsCommande, getDetailBC } from '@/app/actions/bc'

type BCWithNom = BonCommande

interface DetailLine {
  reference: string
  designation: string
  conditionnement: number
  quantite_commandee: number
  prix_unitaire_ht: number
  tva_pct: number
}

const emptyLine = (): DetailLine => ({ reference: '', designation: '', conditionnement: 1, quantite_commandee: 1, prix_unitaire_ht: 0, tva_pct: 19 })

export default function BCClient({
  initialBCs, fournisseurs, articles
}: {
  initialBCs: BCWithNom[]
  fournisseurs: Fournisseur[]
  articles: Article[]
}) {
  const [bcs, setBCs] = useState(initialBCs)
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [selectedBC, setSelectedBC] = useState<string | null>(null)
  const [selectedDetails, setSelectedDetails] = useState<DetailBC[]>([])

  const [form, setForm] = useState({
    fournisseur: '',
    conditions_paiement: '',
    delai_livraison: '',
  })
  const [lines, setLines] = useState<DetailLine[]>([emptyLine()])

  function calcTotals() {
    let ht = 0, tva = 0
    for (const l of lines) {
      const lHT = l.quantite_commandee * l.prix_unitaire_ht
      ht += lHT; tva += lHT * l.tva_pct / 100
    }
    return { ht, tva, ttc: ht + tva }
  }

  function setLine(i: number, field: keyof DetailLine, val: string | number) {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l
      if (field === 'reference') {
        const art = articles.find(a => a.reference === val)
        return { ...l, reference: val as string, designation: art?.designation || '', prix_unitaire_ht: art?.prix_ht || 0, tva_pct: art?.tva || 0, conditionnement: art?.conditionnement || 1 }
      }
      return { ...l, [field]: val }
    }))
  }

  async function viewDetails(numero_bc: string) {
    if (selectedBC === numero_bc) { setSelectedBC(null); return }
    const details = await getDetailBC(numero_bc)
    setSelectedDetails(details || [])
    setSelectedBC(numero_bc)
  }

  function save() {
    if (!form.fournisseur) return
    startTransition(async () => {
      try {
        await createBC(form, lines.filter(l => l.reference || l.designation))
        setBCs(await getBonsCommande())
        setShowModal(false)
        setForm({ fournisseur: '', conditions_paiement: '', delai_livraison: '' })
        setLines([emptyLine()])
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer ce bon de commande et ses lignes ?')) return
    startTransition(async () => {
      try {
        await deleteBC(id)
        setBCs(prev => prev.filter(b => b.numero_bc !== id))
        if (selectedBC === id) setSelectedBC(null)
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  async function handleStatutChange(numero_bc: string, statut: string) {
    startTransition(async () => {
      try {
        await updateBC(numero_bc, { statut: statut as BonCommande['statut'] })
        setBCs(await getBonsCommande())
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  const totals = calcTotals()
  const fournNomMap = fournisseurs.reduce((m, f) => { m[f.code] = f.nom; return m }, {} as Record<string, string>)
  const bcSelected = bcs.find(b => b.numero_bc === selectedBC)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Bons de Commande</h1>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">+ Nouveau BC</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">N° BC</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fournisseur</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Délai livraison</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bcs.map(b => (
              <Fragment key={b.numero_bc}>
                <tr className={`hover:bg-slate-50 ${selectedBC === b.numero_bc ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-blue-600 text-xs">{b.numero_bc}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(b.date_bc)}</td>
                  <td className="px-4 py-3 font-medium">{fournNomMap[b.fournisseur] || b.fournisseur}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{b.delai_livraison || '—'}</td>
                  <td className="px-4 py-3">
                    <select value={b.statut} onChange={e => handleStatutChange(b.numero_bc, e.target.value)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${statutBCColor(b.statut)}`}>
                      {STATUTS_BC.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => viewDetails(b.numero_bc)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">
                        {selectedBC === b.numero_bc ? '▲ Détails' : '▼ Détails'}
                      </button>
                      <button onClick={() => handleDelete(b.numero_bc)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Supprimer</button>
                    </div>
                  </td>
                </tr>
                {selectedBC === b.numero_bc && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 bg-blue-50/30">
                      <div className="text-xs font-semibold text-blue-900 mb-2">Détail du BC — {fournNomMap[b.fournisseur] || b.fournisseur}</div>
                      {selectedDetails.length === 0 ? (
                        <p className="text-xs text-slate-400">Aucun article dans ce BC</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500">
                              <th className="text-left pb-1 pr-4">Référence</th>
                              <th className="text-left pb-1 pr-4">Désignation</th>
                              <th className="text-right pb-1 pr-4">Commandé</th>
                              <th className="text-right pb-1 pr-4">Reçu</th>
                              <th className="text-right pb-1 pr-4">Restant</th>
                              <th className="text-right pb-1">Prix U. HT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDetails.map(d => (
                              <tr key={d.id} className="border-t border-blue-100">
                                <td className="py-1.5 pr-4 font-mono text-blue-600">{d.reference}</td>
                                <td className="py-1.5 pr-4">{d.designation}</td>
                                <td className="py-1.5 pr-4 text-right">{d.quantite_commandee}</td>
                                <td className="py-1.5 pr-4 text-right text-green-600">{d.quantite_recue}</td>
                                <td className={`py-1.5 pr-4 text-right font-semibold ${d.quantite_commandee - d.quantite_recue > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                                  {d.quantite_commandee - d.quantite_recue}
                                </td>
                                <td className="py-1.5 text-right">{formatCurrency(d.prix_unitaire_ht)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {bcs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun bon de commande</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Nouveau Bon de Commande</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fournisseur *</label>
                  <select value={form.fournisseur} onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Sélectionner —</option>
                    {fournisseurs.filter(f => !f.est_labo).map(f => <option key={f.code} value={f.code}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Conditions paiement</label>
                  <input value={form.conditions_paiement} onChange={e => setForm(p => ({ ...p, conditions_paiement: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Délai livraison</label>
                  <input value={form.delai_livraison} onChange={e => setForm(p => ({ ...p, delai_livraison: e.target.value }))} placeholder="ex: 7 jours"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-900">Articles commandés</h4>
                  <button onClick={() => setLines(p => [...p, emptyLine()])} className="text-xs text-blue-600 hover:text-blue-700">+ Ajouter ligne</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Article</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Qté</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Prix U. HT</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">TVA%</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Total HT</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2">
                            <select value={l.reference} onChange={e => setLine(i, 'reference', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                              <option value="">— Sélectionner —</option>
                              {articles.map(a => <option key={a.reference} value={a.reference}>{a.designation}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2"><input type="number" value={l.quantite_commandee} onChange={e => setLine(i, 'quantite_commandee', Number(e.target.value))} className="w-16 px-2 py-1 text-xs border border-slate-200 rounded text-right focus:outline-none" /></td>
                          <td className="px-3 py-2"><input type="number" step="0.001" value={l.prix_unitaire_ht} onChange={e => setLine(i, 'prix_unitaire_ht', Number(e.target.value))} className="w-24 px-2 py-1 text-xs border border-slate-200 rounded text-right focus:outline-none" /></td>
                          <td className="px-3 py-2">
                            <select value={l.tva_pct} onChange={e => setLine(i, 'tva_pct', Number(e.target.value))} className="w-16 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none">
                              {TVA_RATES.map(t => <option key={t} value={t}>{t}%</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-medium">{formatCurrency(l.quantite_commandee * l.prix_unitaire_ht)}</td>
                          <td className="px-3 py-2"><button onClick={() => setLines(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-xs">✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1 max-w-sm ml-auto">
                <div className="flex justify-between"><span className="text-slate-500">Total HT:</span><span>{formatCurrency(totals.ht)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total TVA:</span><span>{formatCurrency(totals.tva)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-200"><span>Total TTC:</span><span className="text-blue-600">{formatCurrency(totals.ttc)}</span></div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={save} disabled={isPending || !form.fournisseur}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isPending ? 'Création...' : 'Créer le BC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
