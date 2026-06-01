import { getStock } from '@/app/actions/stock'
import { getArticles } from '@/app/actions/articles'
import { getFournisseurs } from '@/app/actions/fournisseurs'
import MarchandisesClient from './MarchandisesClient'

export default async function MarchandisesPage() {
  const [stock, articles, fournisseurs] = await Promise.all([
    getStock(),
    getArticles(),
    getFournisseurs(),
  ])
  return <MarchandisesClient initialStock={stock} articles={articles} fournisseurs={fournisseurs} />
}
