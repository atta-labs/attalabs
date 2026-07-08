// Client-side helpers that POST each polymorphic input to /api/audit/resolve-input
// and return a ResolvedJd / ResolvedCv. Files are uploaded via multipart;
// text/url/profile go as JSON.

import type { CvInput, JdInput, ResolvedCv, ResolvedJd } from './types'

const ENDPOINT = '/api/audit/resolve-input'

interface ResolverError {
  error: string
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as ResolverError
    return data.error || `Resolver returned HTTP ${res.status}`
  } catch {
    return `Resolver returned HTTP ${res.status}`
  }
}

export async function resolveJdRequest(input: JdInput): Promise<ResolvedJd> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'jd', input })
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { resolved: ResolvedJd }
  return data.resolved
}

export async function resolveCvJsonRequest(input: CvInput): Promise<ResolvedCv> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'cv', input })
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { resolved: ResolvedCv }
  return data.resolved
}

export async function resolveCvFileRequest(file: File, kind: 'pdf' | 'markdown'): Promise<ResolvedCv> {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  form.append('role', 'cv')
  const res = await fetch(ENDPOINT, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { resolved: ResolvedCv }
  return data.resolved
}

export async function resolveJdFileRequest(file: File, kind: 'pdf' | 'markdown'): Promise<ResolvedJd> {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  form.append('role', 'jd')
  const res = await fetch(ENDPOINT, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { resolved: ResolvedJd }
  return data.resolved
}
