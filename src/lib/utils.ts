import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0.000 TND'
  return `${Number(value).toFixed(3)} TND`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

export function expiresWithin30Days(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  return d > now && d <= in30
}

export function calcDaysLate(dateEcheance: string | null | undefined): number {
  if (!dateEcheance) return 0
  const d = new Date(dateEcheance)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

export function getStatutDette(
  solde: number,
  dateEcheance: string | null | undefined
): string {
  if (solde <= 0) return 'Payé'
  const jours = calcDaysLate(dateEcheance)
  if (jours === 0) return 'Non échue'
  if (jours <= 30) return 'Échue [1;30]'
  if (jours <= 60) return 'Échue [31;60]'
  if (jours <= 90) return 'Échue [61;90]'
  return 'Échue > 90'
}

export function statutDetteColor(statut: string): string {
  switch (statut) {
    case 'Payé': return 'bg-green-100 text-green-800'
    case 'Non échue': return 'bg-yellow-100 text-yellow-800'
    case 'Échue [1;30]': return 'bg-orange-100 text-orange-800'
    case 'Échue [31;60]': return 'bg-red-100 text-red-800'
    case 'Échue [61;90]': return 'bg-red-200 text-red-900'
    case 'Échue > 90': return 'bg-red-300 text-red-900'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function urgenceColor(urgence: string): string {
  switch (urgence) {
    case 'Urgent': return 'bg-orange-100 text-orange-800'
    case 'Très urgent': return 'bg-red-100 text-red-800'
    default: return 'bg-blue-100 text-blue-800'
  }
}

export function statutBCColor(statut: string): string {
  switch (statut) {
    case 'Livré': return 'bg-green-100 text-green-800'
    case 'Partiel': return 'bg-yellow-100 text-yellow-800'
    case 'Annulé': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function fefoColor(statut: string): string {
  switch (statut) {
    case 'Actif': return 'bg-green-100 text-green-800'
    case 'Inactif': return 'bg-blue-100 text-blue-800'
    case 'Épuisé': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-800'
  }
}
