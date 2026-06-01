'use client'

import { useState, useTransition } from 'react'
import { FactureEntete, FactureDetail, Dette, Reglement, Fournisseur, Article, TVA_RATES, MODES_PAIEMENT } from '@/types'
import { formatCurrency, formatDate, statutDetteColor } from '@/lib/utils'
import { createFactureFournisseur, getDettes, getReglements, getFactures, createReglement, deleteFacture } from '@/app/actions/facturation'

type Tab = 'factures' | 'sous-traitants' | 'dettes' | 'reglements'

interface DetailLine {
  reference_article: string
  designation: string
  quantite: number
  prix_unitaire: number
  remise_pct: number
  tva_pct: number
}

const emptyLine = (): DetailLine => ({ reference_article: '', designation: '', quantite: 1, prix_unitaire: 0, remise_pct: 0, tva_pct: 19 })

export default function FacturationClient({
  initialFactures, initialDettes, initialReglements, fournisseurs, articles
}: {
  initialFactures: FactureEntete[]
  initialDettes: Dette[]
  initialReglements: Reglement[]
  fournisseurs: Fournisseur[]
  articles: Article[]
}) {
  const [tab, setTab] = useState<Tab>('factures')
  const [factures, setFactures] = useState(initialFactures)
  const [dettes, setDettes] = useState(initialDettes)
  const [reglements, setReglements] = useState(initialReglements)
  const [isPending, startTransition] = useTransition()
  const [showNewFacture, setShowNewFacture] = useState(false)
  const [showReglement, setShowReglement] = useState(false)
  const [selectedDette, setSelectedDette] = useState<Dette | null>(null)

  // Facture form
  const [factureType, setFactureType] = useState<'fournisseur' | 'sous_traitant'>('fournisseur')
  const [factureForm, setFactureForm] = useState({
    numero_facture: '',
    date_facture: new Date().toISOString().split('T')[0],
    fournisseur: '',
    timbre: 1.000,
  })
  const [lines, setLines] = useState<DetailLine[]>([emptyLine()])

  // Reglement form
  const [reglementForm, setReglementForm] = useState<{
    date_reglement: string
    montant_regle: number
    mode_paiement: string
    reference_paiement: string
  }>({
    date_reglement: new Date().toISOString().split('T')[0],
    montant_regle: 0,
    mode_paiement: MODES_PAIEMENT[0],
    reference_paiement: '',
  })

  const fourn = fournisseurs.filter(f => factureType === 'sous_traitant' ? f.est_labo : !f.est_labo)

  function calcLine(line: DetailLine) {
    const ht = line.quantite * line.prix_unitaire
    const remise = ht * line.remise_pct / 100
    const ht_net = ht - remise
    const tva = ht_net * line.tva_pct / 100
    return { ht, remise, ht_net, tva }
  }

  function calcTotals() {
    let total_ht = 0, total_remise = 0, total_tva = 0
    for (const l of lines) {
      const c = calcLine(l)
      total_ht += c.ht; total_remise += c.remise; total_tva += c.tva
    }
    const ht_net = total_ht - total_remise
    return { total_ht, total_remise, ht_net, total_tva, total_ttc: ht_net + total_tva + factureForm.timbre }
  }

  function setLine(i: number, field: keyof DetailLine, value: string | number) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  function addLine() { setLines(prev => [...prev, emptyLine()]) }
  function removeLine(i: number) { setLines(prev => prev.filter((_, idx) => idx !== i)) }

  async function saveFacture() {
    if (!factureForm.numero_facture || !factureForm.fournisseur) return
    startTransition(async () => {
      try {
        await createFactureFournisseur({ ...factureForm, type_facture: factureType } as Parameters<typeof createFactureFournisseur>[0], lines)
        const [newF, newD] = await Promise.all([getFactures(), getDettes()])
        setFactures(newF); setDettes(newD)
        setShowNewFacture(false)
        setFactureForm({ numero_facture: '', date_facture: new Date().toISOString().split('T')[0], fournisseur: '', timbre: 1 })
        setLines([emptyLine()])
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  async function saveReglement() {
    if (!selectedDette) return
    startTransition(async () => {
      try {
        await createReglement({
          numero_facture: selectedDette.numero_facture,
          fournisseur: selectedDette.fournisseur,
          ...reglementForm,
        })
        const [newD, newR] = await Promise.all([getDettes(), getReglements()])
        setDettes(newD); setReglements(newR)
        setShowReglement(false); setSelectedDette(null)
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  async function handleDeleteFacture(num: string) {
    if (!confirm('Supprimer cette facture et ses dettes ?')) return
    startTransition(async () => {
      try {
        await deleteFacture(num)
        const [newF, newD] = await Promise.all([getFactures(), getDettes()])
        setFactures(newF); setDettes(newD)
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  const totals = calcTotals()
  const facturesFourn = factures.filter(f => f.type_facture === 'fournisseur')
  const facturesST = factures.filter(f => f.type_facture === 'sous_traitant')
  const tabFactures = tab === 'factures' ? facturesFourn : facturesST

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Facturation</h1>
        {(tab === 'factures' || tab === 'sous-traitants') && (
          <button onClick={() => { setFactureType(tab === 'sous-traitants' ? 'sous_traitant' : 'fournisseur'); setShowNewFacture(true) }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            + Nouvelle facture
          </button>
        )}
        {tab === 'dettes' && (
          <button onClick={() => { setShowReglement(true) }}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
            + Enregistrer règlement
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {([['factures', 'Fournisseurs'], ['sous-traitants', 'Sous-traitants'], ['dettes', 'Dettes'], ['reglements', 'Règlements']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* FACTURES TABLE */}
      {(tab === 'factures' || tab === 'sous-traitants') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">N° Facture</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fournisseur</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">HT Net</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">TVA</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">TTC</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tabFactures.map(f => (
                <tr key={f.numero_facture} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-blue-600 text-xs">{f.numero_facture}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(f.date_facture)}</td>
                  <td className="px-4 py-3 font-medium">{f.fournisseur}</td>
                  <td className="px-4 py-3 text-right text-xs">{formatCurrency(f.ht_net)}</td>
                  <td className="px-4 py-3 text-right text-xs">{formatCurrency(f.total_tva)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(f.total_ttc)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDeleteFacture(f.numero_facture)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded">Supprimer</button>
                  </td>
                </tr>
              ))}
              {tabFactures.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Aucune facture</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* DETTES TABLE */}
      {tab === 'dettes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Facture</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fournisseur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Catégorie</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">À payer</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Payé</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Solde</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Échéance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dettes.map(d => {
                const solde = d.montant_a_payer - d.montant_paye
                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-blue-600 text-xs">{d.numero_facture}</td>
                    <td className="px-4 py-3 font-medium">{d.fournisseur}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{d.categorie}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(d.montant_a_payer)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(d.montant_paye)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(solde)}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(d.date_echeance)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutDetteColor(d.statut)}`}>{d.statut}</span>
                    </td>
                    <td className="px-4 py-3">
                      {solde > 0 && (
                        <button onClick={() => {
                          setSelectedDette(d)
                          setReglementForm({ date_reglement: new Date().toISOString().split('T')[0], montant_regle: solde, mode_paiement: MODES_PAIEMENT[0], reference_paiement: '' })
                          setShowReglement(true)
                        }} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded">Régler</button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {dettes.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">Aucune dette</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* REGLEMENTS TABLE */}
      {tab === 'reglements' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Facture</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fournisseur</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Référence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reglements.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-blue-600 text-xs">{r.numero_facture}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(r.date_reglement)}</td>
                  <td className="px-4 py-3">{r.fournisseur}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(r.montant_regle)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.mode_paiement}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{r.reference_paiement || '—'}</td>
                </tr>
              ))}
              {reglements.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun règlement</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* NEW FACTURE MODAL */}
      {showNewFacture && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Nouvelle facture {factureType === 'sous_traitant' ? 'sous-traitant' : 'fournisseur'}</h3>
              <button onClick={() => setShowNewFacture(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">N° Facture *</label>
                  <input value={factureForm.numero_facture} onChange={e => setFactureForm(p => ({ ...p, numero_facture: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date facture</label>
                  <input type="date" value={factureForm.date_facture} onChange={e => setFactureForm(p => ({ ...p, date_facture: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fournisseur *</label>
                  <select value={factureForm.fournisseur} onChange={e => setFactureForm(p => ({ ...p, fournisseur: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Sélectionner —</option>
                    {fourn.map(f => <option key={f.code} value={f.code}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Timbre fiscal</label>
                  <input type="number" step="0.001" value={factureForm.timbre} onChange={e => setFactureForm(p => ({ ...p, timbre: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {factureType === 'fournisseur' && (
                <div className="mb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Article</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Qté</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Prix U.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Remise%</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">TVA%</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">HT Net</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l, i) => {
                          const c = calcLine(l)
                          return (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="px-3 py-2">
                                <select value={l.reference_article} onChange={e => {
                                  const art = articles.find(a => a.reference === e.target.value)
                                  setLines(prev => prev.map((ln, idx) => idx === i ? { ...ln, reference_article: e.target.value, designation: art?.designation || '', prix_unitaire: art?.prix_ht || 0, tva_pct: art?.tva || 0 } : ln))
                                }} className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500">
                                  <option value="">— Article —</option>
                                  {articles.map(a => <option key={a.reference} value={a.reference}>{a.designation}</option>)}
                                </select>
                              </td>
                              <td className="px-3 py-2"><input type="number" value={l.quantite} onChange={e => setLine(i, 'quantite', Number(e.target.value))} className="w-16 px-2 py-1 text-xs border border-slate-200 rounded text-right focus:outline-none" /></td>
                              <td className="px-3 py-2"><input type="number" step="0.001" value={l.prix_unitaire} onChange={e => setLine(i, 'prix_unitaire', Number(e.target.value))} className="w-24 px-2 py-1 text-xs border border-slate-200 rounded text-right focus:outline-none" /></td>
                              <td className="px-3 py-2"><input type="number" value={l.remise_pct} onChange={e => setLine(i, 'remise_pct', Number(e.target.value))} className="w-16 px-2 py-1 text-xs border border-slate-200 rounded text-right focus:outline-none" /></td>
                              <td className="px-3 py-2">
                                <select value={l.tva_pct} onChange={e => setLine(i, 'tva_pct', Number(e.target.value))} className="w-16 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none">
                                  {TVA_RATES.map(t => <option key={t} value={t}>{t}%</option>)}
                                </select>
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-medium">{formatCurrency(c.ht_net)}</td>
                              <td className="px-3 py-2"><button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={addLine} className="mt-2 text-xs text-blue-600 hover:text-blue-700">+ Ajouter une ligne</button>
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1 max-w-sm ml-auto">
                <div className="flex justify-between"><span className="text-slate-500">Total HT:</span><span>{formatCurrency(totals.total_ht)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Remise:</span><span className="text-red-500">-{formatCurrency(totals.total_remise)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">HT Net:</span><span>{formatCurrency(totals.ht_net)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">TVA:</span><span>{formatCurrency(totals.total_tva)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Timbre:</span><span>{formatCurrency(factureForm.timbre)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1 border-t border-slate-200"><span>Total TTC:</span><span className="text-blue-600">{formatCurrency(totals.total_ttc)}</span></div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowNewFacture(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={saveFacture} disabled={isPending || !factureForm.numero_facture || !factureForm.fournisseur}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isPending ? 'Enregistrement...' : 'Enregistrer la facture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGLEMENT MODAL */}
      {showReglement && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Enregistrer un règlement</h3>
              <button onClick={() => { setShowReglement(false); setSelectedDette(null) }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {!selectedDette && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Facture</label>
                  <select onChange={e => setSelectedDette(dettes.find(d => d.id === e.target.value) || null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Sélectionner —</option>
                    {dettes.filter(d => d.montant_a_payer - d.montant_paye > 0).map(d => (
                      <option key={d.id} value={d.id}>{d.numero_facture} — {d.fournisseur} — Solde: {formatCurrency(d.montant_a_payer - d.montant_paye)}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedDette && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs">
                  <div className="font-medium">{selectedDette.numero_facture} — {selectedDette.fournisseur}</div>
                  <div className="text-slate-500">Solde: {formatCurrency(selectedDette.montant_a_payer - selectedDette.montant_paye)}</div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date de règlement</label>
                <input type="date" value={reglementForm.date_reglement} onChange={e => setReglementForm(p => ({ ...p, date_reglement: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Montant réglé</label>
                <input type="number" step="0.001" value={reglementForm.montant_regle} onChange={e => setReglementForm(p => ({ ...p, montant_regle: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mode de paiement</label>
                <select value={reglementForm.mode_paiement} onChange={e => setReglementForm(p => ({ ...p, mode_paiement: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {MODES_PAIEMENT.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Référence (chèque/virement)</label>
                <input value={reglementForm.reference_paiement} onChange={e => setReglementForm(p => ({ ...p, reference_paiement: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => { setShowReglement(false); setSelectedDette(null) }} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={saveReglement} disabled={isPending || !selectedDette || reglementForm.montant_regle <= 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
                {isPending ? 'Enregistrement...' : 'Valider le règlement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
