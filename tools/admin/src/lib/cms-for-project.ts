import { createClient } from '@sanity/client'
import { PROJECT_CONFIG } from './project-config'
import type { ProjectKey } from './project-config'

export function getCmsClientsForProject(projectKey: ProjectKey) {
  const { projectId } = PROJECT_CONFIG[projectKey]
  const tokenKey = `SANITY_API_TOKEN_${projectKey.toUpperCase()}`
  const token = process.env[tokenKey] ?? process.env.SANITY_API_TOKEN
  const base = { projectId, dataset: 'production', apiVersion: '2024-01-01' }
  return {
    readClient: createClient({ ...base, useCdn: false }),
    writeClient: createClient({ ...base, token, useCdn: false })
  }
}
