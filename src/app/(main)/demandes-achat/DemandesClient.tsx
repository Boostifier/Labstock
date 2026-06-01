'use client'

import { useState, useTransition } from 'react'
import { DemandeAchat, Article, Fournisseur, CATEGORIES, URGENCES } from '@/types'
import { formatDate, urgenceColor } from '@/lib/utils'
import { createDemande, updateDemande, deleteDemande, convertirEnBC, getDemandes } from '@/app/actions/da'

export default function DemandesClient({
  initialDemandes, articles, fournisseurs
}: {
  initialDemandes: DemandeAchat[]
  articles: Article[]
  fournisseurs: Fournisseur[]
}) {
  const [demandes, setDemandes] = useState(initialDemandes)
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [editDA, setEditDA] = useState<DemandeAchat | null>(null)
  const [form, setForm] = useState({
    reference_article: '',
    designation: '',
    categorie: CATEGORIES[0] as string,
    quantite: 1,
    unite: 'Unité',
    fournisseur_suggere: '',
    urgence: 'Normal' as DemandeAchat['urgence'],
    commentaire: '',
  })

  function openCreate() {
    setEditDA(null)
    setForm({ reference_article: '', designation: '', categorie: CATEGORIES[0] as string, quantite: 1, unite: 'Unité', fournisseur_suggere: '', urgence: 'Normal', commentaire: '' })
    setShowModal(true)
  }
  function openEdit(da: DemandeAchat) {
    setEditDA(da)
    setForm({ reference_article: da.reference_article, designation: da.designation, categorie: da.categorie as string, quantite: da.quantite, unite: da.unite, fournisseur_suggere: da.fournisseur_suggere, urgence: da.urgence, commentaire: da.commentaire })
    setShowModal(true)
  }

  function save() {
    startTransition(async () => {
      try {
        if (editDA) {
          await updateDemande(editDA.numero_da, form)
        } else {
          await createDemande(form)
        }
        setDemandes(await getDemandes())
        setShowModal(false)
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette demande ?')) return
    startTransition(async () => {
      try {
        await deleteDemande(id)
        setDemandes(prev => prev.filter(d => d.numero_da !== id))
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  function handleConvertir(id: string) {
    if (!confirm('Convertir cette DA en Bon de Commande ?')) return
    startTransition(async () => {
      try {
        const bc = await convertirEnBC(id)
        setDemandes(await getDemandes())
        alert(`BC créé : ${bc}`)
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  function selectArticle(ref: string) {
    const art = articles.find(a => a.reference === ref)
    setForm(p => ({ ...p, reference_article: ref, designation: art?.designation || p.designation, categorie: (art?.categorie || p.categorie) as string }))
  }

  const fournNomMap = fournisseurs.reduce((m, f) => { m[f.code] = f.nom; return m }, {} as Record<string, string>)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Demandes d'Achat</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">+ Nouvelle DA</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">N° DA</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Article</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Qté</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fournisseur suggéré</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Urgence</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Statut</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Demandeur</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {demandes.map(d => (
              <tr key={d.numero_da} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-blue-600 text-xs">{d.numero_da}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(d.date_da)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-xs">{d.designation}</div>
                  <div className="text-xs text-slate-400">{d.reference_article}</div>
                </td>
                <td className="px-4 py-3 text-right font-medium">{d.quantite} {d.unite}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{fournNomMap[d.fournisseur_suggere] || d.fournisseur_suggere || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgenceColor(d.urgence)}`}>{d.urgence}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{d.statut}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{d.demandeur}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(d)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Modifier</button>
                    {d.statut === 'En attente' && (
                      <button onClick={() => handleConvertir(d.numero_da)} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded">→ BC</button>
                    )}
                    <button onClick={() => handleDelete(d.numero_da)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">✕</button>
                  </div>
                </td>
              </tr>
            ))}
            {demandes.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">Aucune demande d'achat</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{editDA ? 'Modifier DA' : 'Nouvelle Demande d\'Achat'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Article</label>
                <select value={form.reference_article} onChange={e => selectArticle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Sélectionner un article —</option>
                  {articles.map(a => <option key={a.reference} value={a.reference}>{a.reference} — {a.designation}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Désignation *</label>
                <input value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Quantité</label>
                  <input type="number" min="1" value={form.quantite} onChange={e => setForm(p => ({ ...p, quantite: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Unité</label>
                  <input value={form.unite} onChange={e => setForm(p => ({ ...p, unite: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fournisseur suggéré</label>
                <select value={form.fournisseur_suggere} onChange={e => setForm(p => ({ ...p, fournisseur_suggere: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Aucun —</option>
                  {fournisseurs.filter(f => !f.est_labo).map(f => <option key={f.code} value={f.code}>{f.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Urgence</label>
                <select value={form.urgence} onChange={e => setForm(p => ({ ...p, urgence: e.target.value as DemandeAchat['urgence'] }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {URGENCES.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Commentaire</label>
                <textarea value={form.commentaire} onChange={e => setForm(p => ({ ...p, commentaire: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={save} disabled={isPending || !form.designation}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
