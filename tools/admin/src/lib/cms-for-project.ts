import { createClient } from '@sanity/client'
import { PROJECT_CONFIG } from './project-config'
import type { ProjectKey } from './project-config'
import { PROJECT_IDS } from '@atta/cms'

export type CmsProjectKey = ProjectKey | 'attalabs'

/** The env var holding a project's Sanity write token. */
export function sanityTokenKeyFor(projectKey: CmsProjectKey): string {
  return `SANITY_API_TOKEN_${projectKey.toUpperCase()}`
}

export function getCmsClientsForProject(projectKey: CmsProjectKey) {
  const projectId = projectKey === 'attalabs' ? PROJECT_IDS.attalabs : PROJECT_CONFIG[projectKey].projectId
  const tokenKey = sanityTokenKeyFor(projectKey)
  const token = process.env[tokenKey] ?? process.env.SANITY_API_TOKEN
  const base = { projectId, dataset: 'production', apiVersion: '2024-01-01' }
  return {
    readClient: createClient({ ...base, useCdn: false }),
    writeClient: createClient({ ...base, token, useCdn: false }),
    projectId,
    tokenKey,
    /** False when the project's own token is absent and the generic fallback is in play. */
    hasProjectToken: Boolean(process.env[tokenKey])
  }
}

export type CmsWriteResult = { ok: true } | { ok: false; message: string }

function statusOf(error: unknown): number | undefined {
  const status = (error as { statusCode?: unknown })?.statusCode
  return typeof status === 'number' ? status : undefined
}

/**
 * A read-only (Viewer) token surfaces as a 403 whose body names the missing
 * grant. Match the body too — the status alone would also catch unrelated
 * refusals, and this message tells the reader to mint an Editor token.
 */
function isPermissionDenied(error: unknown): boolean {
  if (statusOf(error) !== 403) return false
  const body = (error as { responseBody?: unknown })?.responseBody
  const text = typeof body === 'string' ? body : body ? JSON.stringify(body) : ''
  const message = error instanceof Error ? error.message : ''
  return /insufficientPermissions|permission "?update"?/i.test(`${text} ${message}`)
}

/**
 * Turn a Sanity write failure into a message that names the thing to fix.
 *
 * A misconfigured token is the overwhelmingly common cause here and it is
 * invisible from the UI otherwise — the write just never lands and the page
 * silently re-reads the old value on refresh. These messages are curated, not
 * raw error text: they never carry a stack trace or a token value.
 */
export function describeCmsWriteError(error: unknown, projectKey: CmsProjectKey, action: string): string {
  const { tokenKey, hasProjectToken, projectId } = getCmsClientsForProject(projectKey)
  const status = statusOf(error)

  // The real error only ever reaches the server log — the client gets the curated line below.
  console.error(`[admin] ${action} failed for ${projectKey} (project ${projectId}, status ${status ?? 'n/a'})`, error)

  if (!hasProjectToken) {
    return `${tokenKey} is not set, so the generic SANITY_API_TOKEN was used and ${projectKey} rejected it. Set ${tokenKey} in tools/admin/.env.local (and in the admin's deployment env).`
  }
  if (isPermissionDenied(error)) {
    return `${tokenKey} is read-only — Sanity requires "update" permission for this write. Create an Editor token for project ${projectId} at manage.sanity.io and replace ${tokenKey}.`
  }
  if (status === 401) {
    return `Sanity rejected ${tokenKey} for project ${projectId}. The token may be revoked or belong to another project.`
  }
  return `Could not ${action} for ${projectKey}. Check ${tokenKey} and the admin server log for details.`
}
