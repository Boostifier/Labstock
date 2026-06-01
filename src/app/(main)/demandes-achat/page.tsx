import { getDemandes } from '@/app/actions/da'
import { getArticles } from '@/app/actions/articles'
import { getFournisseurs } from '@/app/actions/fournisseurs'
import DemandesClient from './DemandesClient'

export default async function DemandesPage() {
  const [demandes, articles, fournisseurs] = await Promise.all([
    getDemandes(),
    getArticles(),
    getFournisseurs(),
  ])
  return <DemandesClient initialDemandes={demandes} articles={articles} fournisseurs={fournisseurs} />
}
