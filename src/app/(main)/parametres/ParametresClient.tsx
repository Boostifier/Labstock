'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Article, Fournisseur, ConfigLabo, CATEGORIES, TVA_RATES } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createArticle, updateArticle, deleteArticle } from '@/app/actions/articles'
import { createFournisseur, updateFournisseur, deleteFournisseur } from '@/app/actions/fournisseurs'
import { updateConfig } from '@/app/actions/config'

type Tab = 'articles' | 'fournisseurs' | 'config'

export default function ParametresClient({
  initialArticles, initialFournisseurs, initialConfig
}: {
  initialArticles: Article[]
  initialFournisseurs: Fournisseur[]
  initialConfig: ConfigLabo | null
}) {
  const [tab, setTab] = useState<Tab>('articles')
  const [articles, setArticles] = useState(initialArticles)
  const [fournisseurs, setFournisseurs] = useState(initialFournisseurs)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Articles state
  const [showArticleModal, setShowArticleModal] = useState(false)
  const [editArticle, setEditArticle] = useState<Article | null>(null)
  const [articleForm, setArticleForm] = useState<{ designation: string; conditionnement: number; categorie: string; prix_ht: number; tva: number }>({ designation: '', conditionnement: 1, categorie: CATEGORIES[0], prix_ht: 0, tva: 0 })
  const [searchArticle, setSearchArticle] = useState('')

  // Fournisseurs state
  const [showFournModal, setShowFournModal] = useState(false)
  const [editFourn, setEditFourn] = useState<Fournisseur | null>(null)
  const [fournForm, setFournForm] = useState({ nom: '', adresse: '', code_postal: '', tel_fax: '', gsm: '', matricule_fiscal: '', email: '' })
  const [searchFourn, setSearchFourn] = useState('')

  // Config state
  const [configForm, setConfigForm] = useState({
    nom_laboratoire: initialConfig?.nom_laboratoire || '',
    adresse: initialConfig?.adresse || '',
    telephone: initialConfig?.telephone || '',
    email: initialConfig?.email || '',
  })
  const [configSaved, setConfigSaved] = useState(false)

  function openArticleCreate() {
    setEditArticle(null)
    setArticleForm({ designation: '', conditionnement: 1, categorie: CATEGORIES[0] as string, prix_ht: 0, tva: 0 })
    setShowArticleModal(true)
  }
  function openArticleEdit(a: Article) {
    setEditArticle(a)
    setArticleForm({ designation: a.designation, conditionnement: a.conditionnement, categorie: a.categorie as string, prix_ht: a.prix_ht, tva: a.tva })
    setShowArticleModal(true)
  }
  function saveArticle() {
    startTransition(async () => {
      try {
        if (editArticle) {
          await updateArticle(editArticle.reference, articleForm)
        } else {
          await createArticle(articleForm)
        }
        router.refresh()
        setShowArticleModal(false)
        const { getArticles } = await import('@/app/actions/articles')
        setArticles(await getArticles())
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }
  function handleDeleteArticle(ref: string) {
    if (!confirm('Supprimer cet article ?')) return
    startTransition(async () => {
      try {
        await deleteArticle(ref)
        setArticles(prev => prev.filter(a => a.reference !== ref))
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  function openFournCreate() {
    setEditFourn(null)
    setFournForm({ nom: '', adresse: '', code_postal: '', tel_fax: '', gsm: '', matricule_fiscal: '', email: '' })
    setShowFournModal(true)
  }
  function openFournEdit(f: Fournisseur) {
    setEditFourn(f)
    setFournForm({ nom: f.nom, adresse: f.adresse, code_postal: f.code_postal, tel_fax: f.tel_fax, gsm: f.gsm, matricule_fiscal: f.matricule_fiscal, email: f.email })
    setShowFournModal(true)
  }
  function saveFourn() {
    startTransition(async () => {
      try {
        if (editFourn) {
          await updateFournisseur(editFourn.code, fournForm)
        } else {
          await createFournisseur(fournForm)
        }
        const { getFournisseurs } = await import('@/app/actions/fournisseurs')
        setFournisseurs(await getFournisseurs())
        setShowFournModal(false)
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }
  function handleDeleteFourn(code: string) {
    if (!confirm('Supprimer ce fournisseur ?')) return
    startTransition(async () => {
      try {
        await deleteFournisseur(code)
        setFournisseurs(prev => prev.filter(f => f.code !== code))
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  function saveConfig() {
    startTransition(async () => {
      try {
        await updateConfig(configForm)
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 3000)
      } catch (e: unknown) { alert((e as Error).message) }
    })
  }

  const filteredArticles = articles.filter(a =>
    a.reference.toLowerCase().includes(searchArticle.toLowerCase()) ||
    a.designation.toLowerCase().includes(searchArticle.toLowerCase())
  )
  const filteredFourn = fournisseurs.filter(f =>
    f.code.toLowerCase().includes(searchFourn.toLowerCase()) ||
    f.nom.toLowerCase().includes(searchFourn.toLowerCase())
  )

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Paramètres</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {([['articles', 'Articles'], ['fournisseurs', 'Fournisseurs'], ['config', 'Configuration']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ARTICLES */}
      {tab === 'articles' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <input value={searchArticle} onChange={e => setSearchArticle(e.target.value)}
              placeholder="Rechercher article..." className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={openArticleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              + Ajouter
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Référence</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Désignation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Cond.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Prix HT</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">TVA</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Prix TTC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Créé le</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredArticles.map(a => (
                  <tr key={a.reference} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-blue-600 text-xs">{a.reference}</td>
                    <td className="px-4 py-3 font-medium">{a.designation}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{a.categorie}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{a.conditionnement}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(a.prix_ht)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{a.tva}%</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(a.prix_ttc)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(a.date_creation)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openArticleEdit(a)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Modifier</button>
                        <button onClick={() => handleDeleteArticle(a.reference)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredArticles.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun article trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FOURNISSEURS */}
      {tab === 'fournisseurs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <input value={searchFourn} onChange={e => setSearchFourn(e.target.value)}
              placeholder="Rechercher fournisseur..." className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={openFournCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              + Ajouter
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tél/Fax</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">GSM</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredFourn.map(f => (
                  <tr key={f.code} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-blue-600 text-xs">{f.code}</td>
                    <td className="px-4 py-3 font-medium">{f.nom}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${f.est_labo ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {f.est_labo ? 'Labo' : 'Fournisseur'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{f.tel_fax || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{f.gsm || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{f.email || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openFournEdit(f)} className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Modifier</button>
                        <button onClick={() => handleDeleteFourn(f.code)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredFourn.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">Aucun fournisseur trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIG */}
      {tab === 'config' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-lg">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Informations du laboratoire</h3>
          <div className="space-y-4">
            {[
              { key: 'nom_laboratoire', label: 'Nom du laboratoire', type: 'text' },
              { key: 'adresse', label: 'Adresse', type: 'text' },
              { key: 'telephone', label: 'Téléphone', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input type={type} value={configForm[key as keyof typeof configForm]}
                  onChange={e => setConfigForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-6">
            <button onClick={saveConfig} disabled={isPending}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Sauvegarder
            </button>
            {configSaved && <span className="text-sm text-green-600 font-medium">✓ Sauvegardé</span>}
          </div>
        </div>
      )}

      {/* ARTICLE MODAL */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{editArticle ? 'Modifier article' : 'Nouvel article'}</h3>
              <button onClick={() => setShowArticleModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {editArticle && <div className="text-xs text-slate-500">Référence: <span className="font-mono font-medium">{editArticle.reference}</span></div>}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Désignation *</label>
                <input value={articleForm.designation} onChange={e => setArticleForm(p => ({ ...p, designation: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Catégorie *</label>
                  <select value={articleForm.categorie} onChange={e => setArticleForm(p => ({ ...p, categorie: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Conditionnement</label>
                  <input type="number" value={articleForm.conditionnement} onChange={e => setArticleForm(p => ({ ...p, conditionnement: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Prix HT (TND)</label>
                  <input type="number" step="0.001" value={articleForm.prix_ht} onChange={e => setArticleForm(p => ({ ...p, prix_ht: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">TVA</label>
                  <select value={articleForm.tva} onChange={e => setArticleForm(p => ({ ...p, tva: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TVA_RATES.map(t => <option key={t} value={t}>{t}%</option>)}
                  </select>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Prix TTC: <span className="font-semibold">{formatCurrency(articleForm.prix_ht * (1 + articleForm.tva / 100))}</span>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowArticleModal(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={saveArticle} disabled={isPending || !articleForm.designation}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOURNISSEUR MODAL */}
      {showFournModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{editFourn ? 'Modifier fournisseur' : 'Nouveau fournisseur'}</h3>
              <button onClick={() => setShowFournModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'nom', label: 'Nom *', type: 'text' },
                { key: 'adresse', label: 'Adresse', type: 'text' },
                { key: 'code_postal', label: 'Code postal', type: 'text' },
                { key: 'tel_fax', label: 'Tél/Fax', type: 'text' },
                { key: 'gsm', label: 'GSM', type: 'text' },
                { key: 'matricule_fiscal', label: 'Matricule fiscal', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input type={type} value={fournForm[key as keyof typeof fournForm]}
                    onChange={e => setFournForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              {fournForm.nom.toUpperCase().includes('LABO') && (
                <div className="text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded">Ce fournisseur sera identifié comme sous-traitant (laboratoire)</div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowFournModal(false)} className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
              <button onClick={saveFourn} disabled={isPending || !fournForm.nom}
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
