import { getArticles } from '@/app/actions/articles'
import { getFournisseurs } from '@/app/actions/fournisseurs'
import { getConfig } from '@/app/actions/config'
import ParametresClient from './ParametresClient'

export default async function ParametresPage() {
  const [articles, fournisseurs, config] = await Promise.all([
    getArticles(),
    getFournisseurs(),
    getConfig(),
  ])
  return <ParametresClient initialArticles={articles} initialFournisseurs={fournisseurs} initialConfig={config} />
}
