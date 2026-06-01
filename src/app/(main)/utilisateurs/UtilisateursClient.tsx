'use client'

import { useState, useTransition } from 'react'
import { User } from '@/types'
import { formatDate } from '@/lib/utils'
import { createUser, updateUser, deleteUser } from '@/app/actions/users'

const DROITS = [
  { key: 'droit_parametres', label: 'Paramètres' },
  { key: 'droit_marchandises', label: 'Marchandises' },
  { key: 'droit_facturation', label: 'Facturation' },
  { key: 'droit_operations', label: 'Opérations' },
  { key: 'droit_inventaire', label: 'Inventaire' },
  { key: 'droit_demande_achat', label: 'Demandes d\'achat' },
  { key: 'droit_bon_commande', label: 'Bons de commande' },
  { key: 'droit_satisfaction_f', label: 'Satisfaction fournisseur' },
  { key: 'droit_stock_bord', label: 'Stock (tableau de bord)' },
  { key: 'droit_factures_bord', label: 'Factures (tableau de bord)' },
] as const

type DroitKey = typeof DROITS[number]['key']

const defaultDroits = DROITS.reduce((acc, d) => { acc[d.key] = false; return acc }, {} as Record<DroitKey, boolean>)

export default function UtilisateursClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({
    nom: '',
    mot_de_passe: '',
    ...defaultDroits,
  })

  function openCreate() {
    setEditUser(null)
    setForm({ nom: '', mot_de_passe: '', ...defaultDroits })
    setShowModal(true)
  }

  function openEdit(u: User) {
    setEditUser(u)
    setForm({
      nom: u.nom,
      mot_de_passe: '',
      droit_parametres: u.droit_parametres,
      droit_marchandises: u.droit_marchandises,
      droit_facturation: u.droit_facturation,
      droit_operations: u.droit_operations,
      droit_inventaire: u.droit_inventaire,
      droit_demande_achat: u.droit_demande_achat,
      droit_bon_commande: u.droit_bon_commande,
      droit_satisfaction_f: u.droit_satisfaction_f,
      droit_stock_bord: u.droit_stock_bord,
      droit_factures_bord: u.droit_factures_bord,
    })
    setShowModal(true)
  }

  function toggleAll(val: boolean) {
    const update = DROITS.reduce((acc, d) => { acc[d.key] = val; return acc }, {} as Record<DroitKey, boolean>)
    setForm(p => ({ ...p, ...update }))
  }

  function save() {
    startTransition(async () => {
      try {
        if (editUser) {
          const updateData: Parameters<typeof updateUser>[1] = {
            nom: form.nom,
            droit_parametres: form.droit_parametres,
            droit_marchandises: form.droit_marchandises,
            droit_facturation: form.droit_facturation,
            droit_operations: form.droit_operations,
            droit_inventaire: form.droit_inventaire,
            droit_demande_achat: form.droit_demande_achat,
            droit_bon_commande: form.droit_bon_commande,
            droit_satisfaction_f: form.droit_satisfaction_f,
            droit_stock_bord: form.droit_stock_bord,
            droit_factures_bord: form.droit_factures_bord,
          }
          if (form.mot_de_passe) updateData.mot_de_passe = form.mot_de_passe
          await updateUser(editUser.id, updateData)
        } else {
          await createUser({
            nom: form.nom,
            mot_de_passe: form.mot_de_passe,
            droit_parametres: form.droit_parametres,
            droit_marchandises: form.droit_marchandises,
            droit_facturation: form.droit_facturation,
            droit_operations: form.droit_operations,
            droit_inventaire: form.droit_inventaire,
            droit_demande_achat: form.droit_demande_achat,
            droit_bon_commande: form.droit_bon_commande,
            droit_satisfaction_f: form.droit_satisfaction_f,
            droit_stock_bord: form.droit_stock_bord,
            droit_factures_bord: form.droit_factures_bord,
          })
        }
        const { getUsers } = await import('@/app/actions/users')
        setUsers(await getUsers())
        setShowModal(false)
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  function handleDelete(u: User) {
    if (!confirm(`Supprimer l'utilisateur "${u.nom}" ?`)) return
    startTransition(async () => {
      try {
        await deleteUser(u.id)
        setUsers(prev => prev.filter(x => x.id !== u.id))
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Gestion des utilisateurs</h1>
          <p className="text-xs text-slate-500 mt-0.5">Accessible uniquement au compte système LABSTOCK</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          + Nouvel utilisateur
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nom d'utilisateur</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Droits actifs</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Créé le</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(u => {
              const droitsActifs = DROITS.filter(d => u[d.key as keyof User]).length
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${u.is_system ? 'bg-slate-800' : 'bg-blue-500'}`}>
                        {u.nom.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{u.nom}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_system ? (
                      <span className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded font-medium">Système</span>
                    ) : (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Utilisateur</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_system ? (
                      <span className="text-xs text-slate-500">Tous les droits</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {droitsActifs === 0 ? (
                          <span className="text-xs text-red-400">Aucun droit</span>
                        ) : droitsActifs === DROITS.length ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Tous ({droitsActifs})</span>
                        ) : (
                          DROITS.filter(d => u[d.key as keyof User]).map(d => (
                            <span key={d.key} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{d.label}</span>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.created_at ? formatDate(u.created_at) : '—'}</td>
                  <td className="px-4 py-3">
                    {!u.is_system && (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(u)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Modifier</button>
                        <button onClick={() => handleDelete(u)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun utilisateur</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{editUser ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nom d'utilisateur *</label>
                <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: jean.dupont" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Mot de passe {editUser ? '(laisser vide pour ne pas changer)' : '*'}
                </label>
                <input type="password" value={form.mot_de_passe} onChange={e => setForm(p => ({ ...p, mot_de_passe: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-600">Droits d'accès</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => toggleAll(true)}
                      className="text-xs text-blue-600 hover:text-blue-700">Tout cocher</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={() => toggleAll(false)}
                      className="text-xs text-slate-500 hover:text-slate-700">Tout décocher</button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {DROITS.map(d => (
                    <label key={d.key} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[d.key]}
                        onChange={e => setForm(p => ({ ...p, [d.key]: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={save} disabled={isPending || !form.nom || (!editUser && !form.mot_de_passe)}
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
