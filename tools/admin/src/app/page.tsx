import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { DEFAULT_PROJECT, isValidProject } from '@/lib/project-config'

export default async function HomePage() {
  const cookieStore = await cookies()
  const saved = cookieStore.get('atta-admin-project')?.value
  const project = saved && isValidProject(saved) ? saved : DEFAULT_PROJECT
  redirect(`/${project}/themes`)
}
