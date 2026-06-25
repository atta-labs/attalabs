import { createClient } from '@sanity/client'
import { PROJECT_CONFIG } from './project-config'
import type { ProjectKey } from './project-config'
import { PROJECT_IDS } from '@atta/cms'

export function getCmsClientsForProject(projectKey: ProjectKey | 'attalabs') {
  const projectId = projectKey === 'attalabs' ? PROJECT_IDS.attalabs : PROJECT_CONFIG[projectKey].projectId
  const tokenKey = `SANITY_API_TOKEN_${projectKey.toUpperCase()}`
  const token = process.env[tokenKey] ?? process.env.SANITY_API_TOKEN
  const base = { projectId, dataset: 'production', apiVersion: '2024-01-01' }
  return {
    readClient: createClient({ ...base, useCdn: false }),
    writeClient: createClient({ ...base, token, useCdn: false })
  }
}
