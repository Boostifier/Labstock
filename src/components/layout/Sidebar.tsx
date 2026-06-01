'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SessionUser } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  permission?: keyof SessionUser
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="w-5 h-5 flex items-center justify-center text-base">{children}</span>
}

export default function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Tableau de bord', icon: <Icon>📊</Icon>, permission: 'droit_stock_bord' },
    { href: '/marchandises', label: 'Marchandises', icon: <Icon>📦</Icon>, permission: 'droit_marchandises' },
    { href: '/operations', label: 'Opérations', icon: <Icon>↕️</Icon>, permission: 'droit_operations' },
    { href: '/facturation', label: 'Facturation', icon: <Icon>🧾</Icon>, permission: 'droit_facturation' },
    { href: '/inventaire', label: 'Inventaire', icon: <Icon>📋</Icon>, permission: 'droit_inventaire' },
    { href: '/demandes-achat', label: "Demandes d'Achat", icon: <Icon>📝</Icon>, permission: 'droit_demande_achat' },
    { href: '/bons-commande', label: 'Bons de Commande', icon: <Icon>🛒</Icon>, permission: 'droit_bon_commande' },
    { href: '/satisfaction', label: 'Satisfaction', icon: <Icon>⭐</Icon>, permission: 'droit_satisfaction_f' },
    { href: '/parametres', label: 'Paramètres', icon: <Icon>⚙️</Icon>, permission: 'droit_parametres' },
    { href: '/utilisateurs', label: 'Utilisateurs', icon: <Icon>👥</Icon> },
  ]

  const visibleItems = navItems.filter(item => {
    if (!item.permission) return user.is_system
    return user[item.permission] === true || user.is_system
  })

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col h-full bg-slate-900 text-white" style={{ width: '240px', minWidth: '240px' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .23 2.716-1.189 2.716H3.987c-1.419 0-2.19-1.716-1.19-2.716L4 14.5" />
          </svg>
        </div>
        <div>
          <div className="font-bold text-white text-sm tracking-wide">LABSTOCK</div>
          <div className="text-slate-500 text-xs">v1.0 — Tunisie</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-0.5">
          {visibleItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User info */}
      <div className="px-3 py-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
          <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-slate-300">
              {user.nom.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user.nom}</div>
            <div className="text-xs text-slate-500">
              {user.is_system ? 'Administrateur' : 'Utilisateur'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
