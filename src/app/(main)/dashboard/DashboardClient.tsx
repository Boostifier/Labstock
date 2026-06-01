'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getDashboardData, getEvolutionMensuelle } from '@/app/actions/dashboard'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface DashboardData {
  kpis: {
    valeur_stock: number
    total_lots: number
    total_references: number
    sorties_mois: number
    entrees_mois: number
    ruptures: number
    alertes: number
    lots_sains: number
    surstock: number
  }
  fefo: { actifs: number; inactifs: number; epuises: number }
  alertesList: Array<{ type: string; niveau: string; reference: string; designation: string; lot: string }>
  dernSorties: Array<{ type: string; date: string; article: string; quantite: number }>
  dernEntrees: Array<{ type: string; date: string; article: string; quantite: number }>
  top5: Array<{ reference: string; designation: string; total: number }>
}

function KPICard({ title, value, sub, color }: { title: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export default function DashboardClient({
  data: initialData,
  evolution: initialEvolution,
}: {
  data: DashboardData
  evolution: Array<{ mois: string; sorties: number; entrees: number }>
}) {
  const [data, setData] = useState(initialData)
  const [evolution, setEvolution] = useState(initialEvolution)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function refresh() {
    startTransition(async () => {
      const [newData, newEvol] = await Promise.all([getDashboardData(), getEvolutionMensuelle()])
      setData(newData)
      setEvolution(newEvol)
      setLastUpdate(new Date())
    })
  }

  const { kpis, fefo, alertesList, dernSorties, dernEntrees, top5 } = data
  const total = fefo.actifs + fefo.inactifs + fefo.epuises
  const capacite = total > 0 ? Math.round((kpis.lots_sains / total) * 100) : 0

  const pieData = [
    { name: 'Sains', value: kpis.lots_sains },
    { name: 'Alertes', value: kpis.alertes },
    { name: 'Ruptures', value: kpis.ruptures },
    { name: 'Surstock', value: kpis.surstock },
  ].filter(d => d.value > 0)

  const dernMouvements = [...dernSorties.map(s => ({ ...s, type: 'SORTIE' })), ...dernEntrees.map(e => ({ ...e, type: 'ENTREE' }))]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tableau de bord</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Rafraîchir
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPICard title="Valeur du stock" value={formatCurrency(kpis.valeur_stock)} color="text-blue-600" />
        <KPICard title="Lots en stock" value={kpis.total_lots.toString()} sub={`${kpis.total_references} références`} color="text-slate-900" />
        <KPICard title="Sorties du mois" value={kpis.sorties_mois.toString()} color="text-amber-600" />
        <KPICard title="Entrées du mois" value={kpis.entrees_mois.toString()} color="text-green-600" />
        <KPICard title="Ruptures" value={kpis.ruptures.toString()} color="text-red-600" />
        <KPICard title="Alertes (< 5)" value={kpis.alertes.toString()} color="text-orange-600" />
        <KPICard title="Lots sains" value={kpis.lots_sains.toString()} color="text-green-600" />
        <KPICard title="Surstock (> 500)" value={kpis.surstock.toString()} color="text-purple-600" />
      </div>

      {/* Capacity bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Capacité stock utilisée</span>
          <span className="text-sm font-bold text-slate-900">{capacite}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${capacite < 50 ? 'bg-green-500' : capacite < 80 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(capacite, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Alerts */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Alertes</h3>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {alertesList.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {alertesList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Aucune alerte</p>
            ) : alertesList.map((a, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-2">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                  a.niveau === 'CRITIQUE' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>{a.type}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-900 truncate">{a.designation}</div>
                  <div className="text-xs text-slate-400">{a.reference} • Lot: {a.lot}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent movements */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Derniers mouvements</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {dernMouvements.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Aucun mouvement</p>
            ) : dernMouvements.map((m, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  m.type === 'SORTIE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>{m.type}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-900 truncate">{m.article}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold text-slate-900">{m.quantite}</div>
                  <div className="text-xs text-slate-400">{formatDate(m.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* FEFO Status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Statut FEFO</h3>
          <div className="space-y-3">
            {[
              { label: 'ACTIFS', value: fefo.actifs, color: 'bg-green-500' },
              { label: 'INACTIFS', value: fefo.inactifs, color: 'bg-blue-500' },
              { label: 'ÉPUISÉS', value: fefo.epuises, color: 'bg-slate-300' },
            ].map(f => (
              <div key={f.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">{f.label}</span>
                  <span className="font-semibold">{f.value} ({total > 0 ? Math.round(f.value / total * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`${f.color} h-2 rounded-full`} style={{ width: `${total > 0 ? (f.value / total * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Répartition du stock</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Pas de données</p>
          )}
        </div>

        {/* Top 5 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Top 5 consommations</h3>
          <div className="space-y-2">
            {top5.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Pas de données</p>
            ) : top5.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 truncate max-w-[140px]">{item.designation}</span>
                  <span className="font-semibold ml-2">{item.total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${top5[0].total > 0 ? (item.total / top5[0].total * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evolution chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Évolution mensuelle (Entrées / Sorties)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={evolution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="entrees" stroke="#22c55e" name="Entrées" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sorties" stroke="#ef4444" name="Sorties" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
