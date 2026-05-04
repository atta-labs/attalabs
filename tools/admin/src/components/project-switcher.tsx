'use client'

import { usePathname, useRouter } from 'next/navigation'
import { PROJECT_CONFIG, PROJECT_KEYS, isValidProject } from '@/lib/project-config'
import type { ProjectKey } from '@/lib/project-config'

export function ProjectSwitcher() {
  const pathname = usePathname()
  const router = useRouter()

  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0] ?? ''
  const currentProject: ProjectKey = isValidProject(firstSegment) ? firstSegment : 'vada'

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value
    if (!isValidProject(next)) return
    document.cookie = `atta-admin-project=${next};path=/;max-age=31536000`
    const subPath = segments.slice(1).join('/')
    router.push(subPath ? `/${next}/${subPath}` : `/${next}/themes`)
  }

  return (
    <select
      value={currentProject}
      onChange={handleChange}
      className='h-7 w-28 rounded border border-border bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring'
    >
      {PROJECT_KEYS.map((key) => (
        <option key={key} value={key}>
          {PROJECT_CONFIG[key].displayName}
        </option>
      ))}
    </select>
  )
}
