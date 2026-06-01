import { getBonsCommande } from '@/app/actions/bc'
import { getFournisseurs } from '@/app/actions/fournisseurs'
import { getArticles } from '@/app/actions/articles'
import BCClient from './BCClient'

export default async function BCPage() {
  const [bcs, fournisseurs, articles] = await Promise.all([
    getBonsCommande(),
    getFournisseurs(),
    getArticles(),
  ])
  return <BCClient initialBCs={bcs} fournisseurs={fournisseurs} articles={articles} />
}
