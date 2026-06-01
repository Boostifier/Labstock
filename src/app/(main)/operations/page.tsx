import { getStock } from '@/app/actions/stock'
import { getSorties, getEntrees } from '@/app/actions/stock'
import { getBonsCommande } from '@/app/actions/bc'
import { getDetailBC } from '@/app/actions/bc'
import { getFournisseurs } from '@/app/actions/fournisseurs'
import OperationsClient from './OperationsClient'

export default async function OperationsPage() {
  const [stock, sorties, entrees, bcs, fournisseurs] = await Promise.all([
    getStock(),
    getSorties(),
    getEntrees(),
    getBonsCommande(),
    getFournisseurs(),
  ])
  return <OperationsClient initialStock={stock} initialSorties={sorties} initialEntrees={entrees} bcs={bcs} fournisseurs={fournisseurs} />
}
