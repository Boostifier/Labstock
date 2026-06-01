import { getUsers } from '@/app/actions/users'
import UtilisateursClient from './UtilisateursClient'

export default async function UtilisateursPage() {
  const users = await getUsers()
  return <UtilisateursClient initialUsers={users} />
}
