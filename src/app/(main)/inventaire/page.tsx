import { getInventaire, getAudits } from '@/app/actions/inventaire'
import { getStock } from '@/app/actions/stock'
import InventaireClient from './InventaireClient'

export default async function InventairePage() {
  const [inventaire, audits, stock] = await Promise.all([
    getInventaire(),
    getAudits(),
    getStock(),
  ])
  return <InventaireClient initialInventaire={inventaire} initialAudits={audits} stock={stock} />
}
