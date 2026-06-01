import { getDashboardData, getEvolutionMensuelle } from '@/app/actions/dashboard'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const [data, evolution] = await Promise.all([
    getDashboardData(),
    getEvolutionMensuelle(),
  ])
  return <DashboardClient data={data} evolution={evolution} />
}
