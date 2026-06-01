import { getEvaluations, getMoyenneParFournisseur } from '@/app/actions/satisfaction'
import { getFournisseurs } from '@/app/actions/fournisseurs'
import SatisfactionClient from './SatisfactionClient'

export default async function SatisfactionPage() {
  const [evaluations, moyennes, fournisseurs] = await Promise.all([
    getEvaluations(),
    getMoyenneParFournisseur(),
    getFournisseurs(),
  ])
  return <SatisfactionClient initialEvaluations={evaluations} moyennes={moyennes} fournisseurs={fournisseurs} />
}
