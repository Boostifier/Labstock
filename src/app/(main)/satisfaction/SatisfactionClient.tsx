'use client'

import { useState, useTransition } from 'react'
import { Fournisseur } from '@/types'
import { formatDate } from '@/lib/utils'
import { createEvaluation, deleteEvaluation } from '@/app/actions/satisfaction'

interface Evaluation {
  id: string
  fournisseur: string
  date_evaluation: string
  reference_bc_facture?: string
  note_delais: number
  note_qualite: number
  note_conformite: number
  note_service: number
  note_prix: number
  note_globale: number
  commentaire?: string
  fournisseurs?: { nom: string }
}

interface Moyenne {
  code: string
  nom: string
  count: number
  note_delais: number
  note_qualite: number
  note_conformite: number
  note_service: number
  note_prix: number
  note_globale: number
}

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={readonly}
          className={`text-lg leading-none ${star <= value ? 'text-yellow-400' : 'text-slate-200'} ${!readonly ? 'hover:text-yellow-300 cursor-pointer' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function NoteBar({ note, max = 5 }: { note: number; max?: number }) {
  const pct = (note / max) * 100
  const color = note >= 4 ? 'bg-green-500' : note >= 3 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-8 text-right">{note.toFixed(1)}</span>
    </div>
  )
}

const noteColor = (note: number) =>
  note >= 4 ? 'text-green-600' : note >= 3 ? 'text-yellow-600' : 'text-red-600'

const CRITERIA = [
  { key: 'note_delais', label: 'Délai de livraison' },
  { key: 'note_qualite', label: 'Qualité' },
  { key: 'note_conformite', label: 'Conformité' },
  { key: 'note_service', label: 'Service' },
  { key: 'note_prix', label: 'Prix' },
] as const

export default function SatisfactionClient({
  initialEvaluations, moyennes, fournisseurs
}: {
  initialEvaluations: Evaluation[]
  moyennes: Moyenne[]
  fournisseurs: Fournisseur[]
}) {
  const [evaluations, setEvaluations] = useState(initialEvaluations)
  const [moyennesState, setMoyennesState] = useState(moyennes)
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    fournisseur: '',
    reference_bc_facture: '',
    note_delais: 3,
    note_qualite: 3,
    note_conformite: 3,
    note_service: 3,
    note_prix: 3,
    commentaire: '',
  })

  const fournExternes = fournisseurs.filter(f => !f.est_labo)
  const fournMap = fournisseurs.reduce((m, f) => { m[f.code] = f.nom; return m }, {} as Record<string, string>)

  function openCreate() {
    setForm({ fournisseur: '', reference_bc_facture: '', note_delais: 3, note_qualite: 3, note_conformite: 3, note_service: 3, note_prix: 3, commentaire: '' })
    setShowModal(true)
  }

  function save() {
    if (!form.fournisseur) return
    startTransition(async () => {
      try {
        await createEvaluation({
          fournisseur: form.fournisseur,
          reference_bc_facture: form.reference_bc_facture || undefined,
          note_delais: form.note_delais,
          note_qualite: form.note_qualite,
          note_conformite: form.note_conformite,
          note_service: form.note_service,
          note_prix: form.note_prix,
          commentaire: form.commentaire || undefined,
        })
        const { getEvaluations, getMoyenneParFournisseur } = await import('@/app/actions/satisfaction')
        const [newEvals, newMoyennes] = await Promise.all([getEvaluations(), getMoyenneParFournisseur()])
        setEvaluations(newEvals as unknown as Evaluation[])
        setMoyennesState(newMoyennes)
        setShowModal(false)
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette évaluation ?')) return
    startTransition(async () => {
      try {
        await deleteEvaluation(id)
        setEvaluations(prev => prev.filter(e => e.id !== id))
        const { getMoyenneParFournisseur } = await import('@/app/actions/satisfaction')
        setMoyennesState(await getMoyenneParFournisseur())
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  const noteGlobale = (form.note_delais + form.note_qualite + form.note_conformite + form.note_service + form.note_prix) / 5

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Satisfaction Fournisseurs</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          + Nouvelle évaluation
        </button>
      </div>

      {/* Cards synthèse */}
      {moyennesState.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moyennesState.sort((a, b) => b.note_globale - a.note_globale).map(m => (
            <div key={m.code} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{m.nom}</div>
                  <div className="text-xs text-slate-400">{m.count} évaluation{m.count > 1 ? 's' : ''}</div>
                </div>
                <div className={`text-2xl font-bold ${noteColor(m.note_globale)}`}>
                  {m.note_globale.toFixed(1)}
                  <span className="text-sm font-normal text-slate-400">/5</span>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} className={`text-base ${s <= Math.round(m.note_globale) ? 'text-yellow-400' : 'text-slate-200'}`}>★</span>
                ))}
              </div>
              <div className="space-y-1.5">
                {CRITERIA.map(c => (
                  <div key={c.key}>
                    <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                      <span>{c.label}</span>
                    </div>
                    <NoteBar note={m[c.key]} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table évaluations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Historique des évaluations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fournisseur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Réf BC/Facture</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Délai</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Qualité</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Conformité</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Service</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Prix</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Globale</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Commentaire</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {evaluations.map(ev => (
                <tr key={ev.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-sm">
                    {ev.fournisseurs?.nom || fournMap[ev.fournisseur] || ev.fournisseur}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(ev.date_evaluation)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{ev.reference_bc_facture || '—'}</td>
                  <td className="px-4 py-3 text-center"><StarRating value={ev.note_delais} readonly /></td>
                  <td className="px-4 py-3 text-center"><StarRating value={ev.note_qualite} readonly /></td>
                  <td className="px-4 py-3 text-center"><StarRating value={ev.note_conformite} readonly /></td>
                  <td className="px-4 py-3 text-center"><StarRating value={ev.note_service} readonly /></td>
                  <td className="px-4 py-3 text-center"><StarRating value={ev.note_prix} readonly /></td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-lg font-bold ${noteColor(ev.note_globale)}`}>{ev.note_globale.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{ev.commentaire || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(ev.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">✕</button>
                  </td>
                </tr>
              ))}
              {evaluations.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400 text-sm">Aucune évaluation enregistrée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-slate-900">Nouvelle évaluation fournisseur</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fournisseur *</label>
                <select value={form.fournisseur} onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Sélectionner —</option>
                  {fournExternes.map(f => <option key={f.code} value={f.code}>{f.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Référence BC / Facture</label>
                <input value={form.reference_bc_facture} onChange={e => setForm(p => ({ ...p, reference_bc_facture: e.target.value }))}
                  placeholder="ex: BC-0001 ou F-2024-001"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-medium text-slate-600">Notes (1 à 5 étoiles)</label>
                {CRITERIA.map(c => (
                  <div key={c.key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 w-44">{c.label}</span>
                    <StarRating
                      value={form[c.key]}
                      onChange={v => setForm(p => ({ ...p, [c.key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500 mb-1">Note globale (moyenne)</div>
                <div className={`text-2xl font-bold ${noteColor(noteGlobale)}`}>
                  {noteGlobale.toFixed(2)}
                  <span className="text-sm font-normal text-slate-400">/5</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Commentaire</label>
                <textarea value={form.commentaire} onChange={e => setForm(p => ({ ...p, commentaire: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Points forts, axes d'amélioration..." />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={save} disabled={isPending || !form.fournisseur}
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
