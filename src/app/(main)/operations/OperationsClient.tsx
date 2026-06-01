'use client'

import { useState, useTransition } from 'react'
import { StockLot, Sortie, Entree, Fournisseur, MOTIFS_SORTIE } from '@/types'
import { formatCurrency, formatDate, isExpired } from '@/lib/utils'
import { enregistrerSortie, enregistrerEntree, annulerSortie, getStock, getSorties, getEntrees } from '@/app/actions/stock'
import { getDetailBC } from '@/app/actions/bc'

type Tab = 'sorties' | 'entrees'

interface BC { numero_bc: string; fournisseur: string; statut: string }

export default function OperationsClient({
  initialStock, initialSorties, initialEntrees, bcs, fournisseurs
}: {
  initialStock: StockLot[]
  initialSorties: Sortie[]
  initialEntrees: Entree[]
  bcs: BC[]
  fournisseurs: Fournisseur[]
}) {
  const [tab, setTab] = useState<Tab>('sorties')
  const [stock, setStock] = useState(initialStock)
  const [sorties, setSorties] = useState(initialSorties)
  const [entrees, setEntrees] = useState(initialEntrees)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Sortie form
  const [sortieRef, setSortieRef] = useState('')
  const [sortieBarcode, setSortieBarcode] = useState('')
  const [sortieLot, setSortieLot] = useState('')
  const [sortieQty, setSortieQty] = useState(1)
  const [sortieMotif, setSortieMotif] = useState<string>(MOTIFS_SORTIE[0])

  // Entrée form
  const [entreeBC, setEntreeBC] = useState('')
  const [entreeRef, setEntreeRef] = useState('')
  const [entreeLot, setEntreeLot] = useState('')
  const [entreePeremption, setEntreePeremption] = useState('')
  const [entreeQty, setEntreeQty] = useState(1)
  const [bcDetails, setBcDetails] = useState<Array<{ reference: string; designation: string; quantite_commandee: number; quantite_recue: number }>>([])

  function getSelectedLot(): StockLot | undefined {
    return stock.find(s => s.reference === sortieRef && s.numero_lot === sortieLot)
  }

  function handleBarcodeChange(val: string) {
    setSortieBarcode(val)
    const parts = val.split('#')
    if (parts.length >= 3) {
      setSortieRef(parts[0])
      setSortieLot(parts[2])
    }
  }

  async function loadBCDetails(numero_bc: string) {
    setEntreeBC(numero_bc)
    if (!numero_bc) { setBcDetails([]); return }
    const details = await getDetailBC(numero_bc)
    setBcDetails(details || [])
  }

  function handleSortie() {
    const lot = getSelectedLot()
    if (!lot) { setError('Sélectionnez un lot valide'); return }
    setError('')
    startTransition(async () => {
      try {
        await enregistrerSortie({
          reference: lot.reference,
          designation: lot.designation,
          fournisseur: lot.fournisseur,
          categorie: lot.categorie,
          conditionnement: lot.conditionnement,
          numero_lot: lot.numero_lot,
          date_peremption: lot.date_peremption,
          quantite: sortieQty,
          prix_unitaire: lot.prix_unitaire,
          motif: sortieMotif,
          operateur: 'Utilisateur',
        })
        const [newStock, newSorties] = await Promise.all([getStock(), getSorties()])
        setStock(newStock)
        setSorties(newSorties)
        setSortieRef(''); setSortieBarcode(''); setSortieLot(''); setSortieQty(1)
        setSuccess('Sortie enregistrée avec succès')
        setTimeout(() => setSuccess(''), 3000)
      } catch (e: unknown) { setError((e as Error).message) }
    })
  }

  function handleEntree() {
    if (!entreeRef || !entreeLot || !entreePeremption || entreeQty <= 0) {
      setError('Remplissez tous les champs obligatoires')
      return
    }
    const bcDetail = bcDetails.find(d => d.reference === entreeRef)
    const fourn = bcs.find(b => b.numero_bc === entreeBC)?.fournisseur || ''
    const stockItem = stock.find(s => s.reference === entreeRef)
    setError('')
    startTransition(async () => {
      try {
        await enregistrerEntree({
          reference: entreeRef,
          designation: bcDetail?.designation || stockItem?.designation || entreeRef,
          fournisseur: fourn,
          categorie: stockItem?.categorie || '',
          conditionnement: stockItem?.conditionnement || 1,
          numero_lot: entreeLot,
          date_peremption: entreePeremption,
          quantite: entreeQty,
          prix_unitaire: stockItem?.prix_unitaire || 0,
          operateur: 'Utilisateur',
          numero_bc: entreeBC || undefined,
        })
        const [newStock, newEntrees] = await Promise.all([getStock(), getEntrees()])
        setStock(newStock)
        setEntrees(newEntrees)
        setEntreeRef(''); setEntreeBC(''); setEntreeLot(''); setEntreePeremption(''); setEntreeQty(1); setBcDetails([])
        setSuccess('Entrée enregistrée avec succès')
        setTimeout(() => setSuccess(''), 3000)
      } catch (e: unknown) { setError((e as Error).message) }
    })
  }

  function handleAnnulerSortie(id: string) {
    if (!confirm('Annuler cette sortie ?')) return
    startTransition(async () => {
      try {
        await annulerSortie(id)
        const [newStock, newSorties] = await Promise.all([getStock(), getSorties()])
        setStock(newStock); setSorties(newSorties)
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  const lotsForRef = sortieRef ? stock.filter(s => s.reference === sortieRef && s.quantite_stock > 0) : []
  const selectedLot = getSelectedLot()
  const refs = [...new Set(stock.filter(s => s.quantite_stock > 0).map(s => s.reference))]

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Opérations de Stock</h1>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {(['sorties', 'entrees'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'sorties' ? '↗ Sorties' : '↙ Entrées'}
          </button>
        ))}
      </div>

      {(error || success) && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {error || success}
        </div>
      )}

      {tab === 'sorties' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sortie form */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Enregistrer une sortie</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Scanner code-barres</label>
                <input value={sortieBarcode} onChange={e => handleBarcodeChange(e.target.value)} placeholder="Scannez ou tapez REF#NOM#LOT"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">ou</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Référence article</label>
                <select value={sortieRef} onChange={e => { setSortieRef(e.target.value); setSortieLot('') }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Sélectionner —</option>
                  {refs.map(r => {
                    const s = stock.find(st => st.reference === r)
                    return <option key={r} value={r}>{r} — {s?.designation}</option>
                  })}
                </select>
              </div>
              {sortieRef && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Numéro de lot</label>
                  <select value={sortieLot} onChange={e => setSortieLot(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Sélectionner —</option>
                    {lotsForRef.map(l => (
                      <option key={l.numero_lot} value={l.numero_lot}>
                        {l.numero_lot} — Stock: {l.quantite_stock} {isExpired(l.date_peremption) ? '⚠ PÉRIMÉ' : ''} {l.statut_fefo === 'Actif' ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selectedLot && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
                  <div><span className="text-slate-500">Désignation:</span> <span className="font-medium">{selectedLot.designation}</span></div>
                  <div><span className="text-slate-500">Stock disponible:</span> <span className="font-medium text-green-600">{selectedLot.quantite_stock}</span></div>
                  <div><span className="text-slate-500">Péremption:</span> <span className={isExpired(selectedLot.date_peremption) ? 'text-red-600 font-medium' : ''}>{formatDate(selectedLot.date_peremption)}</span></div>
                  <div><span className="text-slate-500">Prix unitaire:</span> <span className="font-medium">{formatCurrency(selectedLot.prix_unitaire)}</span></div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Quantité</label>
                <input type="number" min="1" max={selectedLot?.quantite_stock || 9999} value={sortieQty} onChange={e => setSortieQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Motif</label>
                <select value={sortieMotif} onChange={e => setSortieMotif(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {MOTIFS_SORTIE.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              {selectedLot && sortieQty > 0 && (
                <div className="text-xs text-slate-600">
                  Total: <span className="font-semibold">{formatCurrency(sortieQty * selectedLot.prix_unitaire)}</span>
                </div>
              )}
              <button onClick={handleSortie} disabled={isPending || !sortieLot || sortieQty <= 0}
                className="w-full py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {isPending ? 'Enregistrement...' : 'Valider la sortie'}
              </button>
            </div>
          </div>

          {/* Sortie history */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Historique des sorties</h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Article</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Lot</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Qté</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Montant</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Motif</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sorties.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(s.date_sortie)}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-medium truncate max-w-[160px]">{s.designation}</div>
                        <div className="text-xs text-slate-400">{s.reference}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{s.numero_lot}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{s.quantite}</td>
                      <td className="px-3 py-2.5 text-right text-xs">{formatCurrency(s.montant_total)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{s.motif}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => handleAnnulerSortie(s.id)} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-1.5 py-0.5 rounded">Annuler</button>
                      </td>
                    </tr>
                  ))}
                  {sorties.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400 text-sm">Aucune sortie</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'entrees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Entrée form */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Réceptionner une commande</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bon de commande (optionnel)</label>
                <select value={entreeBC} onChange={e => loadBCDetails(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Sans BC —</option>
                  {bcs.filter(b => b.statut !== 'Livré' && b.statut !== 'Annulé').map(b => (
                    <option key={b.numero_bc} value={b.numero_bc}>{b.numero_bc} — {b.fournisseur}</option>
                  ))}
                </select>
              </div>
              {bcDetails.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Article du BC</label>
                  <select value={entreeRef} onChange={e => setEntreeRef(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Sélectionner —</option>
                    {bcDetails.map(d => (
                      <option key={d.reference} value={d.reference}>
                        {d.reference} — {d.designation} (restant: {d.quantite_commandee - d.quantite_recue})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!entreeBC && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Référence article</label>
                  <select value={entreeRef} onChange={e => setEntreeRef(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Sélectionner —</option>
                    {[...new Set(stock.map(s => s.reference))].map(r => {
                      const s = stock.find(st => st.reference === r)
                      return <option key={r} value={r}>{r} — {s?.designation}</option>
                    })}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Numéro de lot *</label>
                <input value={entreeLot} onChange={e => setEntreeLot(e.target.value)} placeholder="ex: LOT2026A"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date de péremption *</label>
                <input type="date" value={entreePeremption} onChange={e => setEntreePeremption(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Quantité reçue</label>
                <input type="number" min="1" value={entreeQty} onChange={e => setEntreeQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleEntree} disabled={isPending || !entreeRef || !entreeLot || !entreePeremption}
                className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                {isPending ? 'Enregistrement...' : 'Valider la réception'}
              </button>
            </div>
          </div>

          {/* Entrée history */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Historique des réceptions</h3>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Article</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Lot</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Qté</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Montant</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">BC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {entrees.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(e.date_entree)}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-medium truncate max-w-[160px]">{e.designation}</div>
                        <div className="text-xs text-slate-400">{e.reference}</div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{e.numero_lot}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{e.quantite}</td>
                      <td className="px-3 py-2.5 text-right text-xs">{formatCurrency(e.montant_total)}</td>
                      <td className="px-3 py-2.5 text-xs text-blue-600">{e.numero_bc || '—'}</td>
                    </tr>
                  ))}
                  {entrees.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-sm">Aucune réception</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
