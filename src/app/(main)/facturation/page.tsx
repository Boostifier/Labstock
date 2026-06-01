import { getFactures, getDettes, getReglements } from '@/app/actions/facturation'
import { getFournisseurs } from '@/app/actions/fournisseurs'
import { getArticles } from '@/app/actions/articles'
import FacturationClient from './FacturationClient'

export default async function FacturationPage() {
  const [factures, dettes, reglements, fournisseurs, articles] = await Promise.all([
    getFactures(),
    getDettes(),
    getReglements(),
    getFournisseurs(),
    getArticles(),
  ])
  return <FacturationClient initialFactures={factures} initialDettes={dettes} initialReglements={reglements} fournisseurs={fournisseurs} articles={articles} />
}
