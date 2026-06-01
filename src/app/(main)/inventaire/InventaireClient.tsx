'use client'

import { useState, useTransition } from 'react'
import { InventaireRow, AuditInventaire, StockLot } from '@/types'
import { formatCurrency, formatDate, isExpired } from '@/lib/utils'
import { enregistrerAudit } from '@/app/actions/inventaire'

type Tab = 'analytique' | 'audit'

interface AuditItem {
  reference: string
  designation: string
  numero_lot: string
  stock_systeme: number
  stock_physique: number
}

export default function InventaireClient({
  initialInventaire, initialAudits, stock
}: {
  initialInventaire: InventaireRow[]
  initialAudits: AuditInventaire[]
  stock: StockLot[]
}) {
  const [tab, setTab] = useState<Tab>('analytique')
  const [inventaire] = useState(initialInventaire)
  const [audits, setAudits] = useState(initialAudits)
  const [isPending, startTransition] = useTransition()

  // Audit form
  const [auditItems, setAuditItems] = useState<AuditItem[]>([])
  const [selectedRef, setSelectedRef] = useState('')
  const [auditBarcode, setAuditBarcode] = useState('')
  const [alertePerime, setAlertePerime] = useState(false)

  const refs = [...new Set(stock.map(s => s.reference))]

  function addAuditItem() {
    const lot = stock.find(s => s.reference === selectedRef && s.statut_fefo === 'Actif') || stock.find(s => s.reference === selectedRef)
    if (!lot) return
    const isPerime = isExpired(lot.date_peremption)
    setAlertePerime(isPerime)
    setAuditItems(prev => {
      const exists = prev.find(i => i.reference === lot.reference && i.numero_lot === lot.numero_lot)
      if (exists) return prev
      return [...prev, {
        reference: lot.reference,
        designation: lot.designation,
        numero_lot: lot.numero_lot,
        stock_systeme: lot.quantite_stock,
        stock_physique: lot.quantite_stock,
      }]
    })
  }

  function handleBarcodeAudit(val: string) {
    setAuditBarcode(val)
    const parts = val.split('#')
    if (parts.length >= 3) {
      const ref = parts[0]
      const lotNum = parts[2]
      const lot = stock.find(s => s.reference === ref && s.numero_lot === lotNum)
      if (lot) {
        setAlertePerime(isExpired(lot.date_peremption))
        setAuditItems(prev => {
          const exists = prev.find(i => i.reference === ref && i.numero_lot === lotNum)
          if (exists) return prev
          return [...prev, { reference: ref, designation: lot.designation, numero_lot: lotNum, stock_systeme: lot.quantite_stock, stock_physique: lot.quantite_stock }]
        })
        setAuditBarcode('')
      }
    }
  }

  function updatePhysique(idx: number, val: number) {
    setAuditItems(prev => prev.map((item, i) => i === idx ? { ...item, stock_physique: val } : item))
  }

  function removeAuditItem(idx: number) {
    setAuditItems(prev => prev.filter((_, i) => i !== idx))
  }

  function saveAudit() {
    if (auditItems.length === 0) return
    startTransition(async () => {
      try {
        await enregistrerAudit(auditItems)
        const { getAudits } = await import('@/app/actions/inventaire')
        setAudits(await getAudits())
        setAuditItems([])
        setSelectedRef('')
        alert('Audit enregistré avec succès')
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  const valeurStock = auditItems.reduce((sum, item) => {
    const lot = stock.find(s => s.reference === item.reference && s.numero_lot === item.numero_lot)
    return sum + (item.stock_physique * (lot?.prix_unitaire || 0))
  }, 0)
  const valeurEcart = auditItems.reduce((sum, item) => {
    const lot = stock.find(s => s.reference === item.reference && s.numero_lot === item.numero_lot)
    const ecart = item.stock_physique - item.stock_systeme
    return sum + (ecart * (lot?.prix_unitaire || 0))
  }, 0)

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Inventaire</h1>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {(['analytique', 'audit'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'analytique' ? '📊 Vue analytique' : '📋 Audit physique'}
          </button>
        ))}
      </div>

      {tab === 'analytique' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Référence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Désignation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Catégorie</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Entrées cumulées</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Sorties cumulées</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Stock théorique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {inventaire.map(row => {
                const stockTheorique = row.cumul_entrees - row.cumul_sorties
                return (
                  <tr key={row.reference} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-blue-600 text-xs">{row.reference}</td>
                    <td className="px-4 py-3 font-medium">{row.designation}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{row.categorie}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{row.cumul_entrees}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{row.cumul_sorties}</td>
                    <td className="px-4 py-3 text-right font-bold">{stockTheorique}</td>
                  </tr>
                )
              })}
              {inventaire.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">Aucune donnée d'inventaire. Effectuez des opérations d'entrée/sortie d'abord.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-6">
          {/* Audit controls */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Ajouter des articles à l'audit</h3>
            <div className="flex gap-3 flex-wrap">
              <input value={auditBarcode} onChange={e => handleBarcodeAudit(e.target.value)}
                placeholder="Scanner code-barres (REF#NOM#LOT)" className="px-3 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              <select value={selectedRef} onChange={e => setSelectedRef(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Ou sélectionner une référence —</option>
                {refs.map(r => {
                  const s = stock.find(st => st.reference === r)
                  return <option key={r} value={r}>{r} — {s?.designation}</option>
                })}
              </select>
              <button onClick={addAuditItem} disabled={!selectedRef}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Ajouter
              </button>
            </div>

            {alertePerime && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                ⚠ ATTENTION : Ce lot est PÉRIMÉ !
              </div>
            )}
          </div>

          {auditItems.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Articles en cours d'audit ({auditItems.length})</h3>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>Valeur stock: <span className="font-semibold text-slate-900">{formatCurrency(valeurStock)}</span></span>
                  <span>Valeur écart: <span className={`font-semibold ${valeurEcart >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(valeurEcart)}</span></span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Référence</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Désignation</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Lot</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Stock système</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Stock physique</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Écart</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {auditItems.map((item, idx) => {
                      const ecart = item.stock_physique - item.stock_systeme
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-blue-600 text-xs">{item.reference}</td>
                          <td className="px-4 py-2.5 font-medium text-xs">{item.designation}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{item.numero_lot}</td>
                          <td className="px-4 py-2.5 text-right">{item.stock_systeme}</td>
                          <td className="px-4 py-2.5 text-right">
                            <input type="number" min="0" value={item.stock_physique} onChange={e => updatePhysique(idx, Number(e.target.value))}
                              className="w-20 px-2 py-1 text-sm border border-slate-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${ecart > 0 ? 'text-green-600' : ecart < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {ecart > 0 ? '+' : ''}{ecart}
                          </td>
                          <td className="px-4 py-2.5">
                            <button onClick={() => removeAuditItem(idx)} className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded">✕</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
                <button onClick={saveAudit} disabled={isPending}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isPending ? 'Enregistrement...' : 'Valider l\'audit'}
                </button>
              </div>
            </div>
          )}

          {/* Audit history */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Historique des audits</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Référence</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Lot</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Système</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Physique</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Écart</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {audits.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs text-slate-500">{formatDate(a.date_audit)}</td>
                    <td className="px-4 py-2.5 font-mono text-blue-600 text-xs">{a.reference}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{a.numero_lot}</td>
                    <td className="px-4 py-2.5 text-right">{a.stock_systeme}</td>
                    <td className="px-4 py-2.5 text-right">{a.stock_physique}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${a.ecart > 0 ? 'text-green-600' : a.ecart < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {a.ecart > 0 ? '+' : ''}{a.ecart}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{a.operateur}</td>
                  </tr>
                ))}
                {audits.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun audit réalisé</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
