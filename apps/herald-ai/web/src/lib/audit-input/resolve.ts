import { getUserByUsername } from '@/db/queries'
import type { CvInput, JdInput, ResolvedCv, ResolvedJd } from './types'
import { fetchAndExtractText } from './url-fetch'

const MIN_JD_LENGTH = 20
const MIN_CV_LENGTH = 50

export async function resolveJdInput(input: JdInput): Promise<ResolvedJd> {
  if (input.kind === 'text') {
    const text = input.value.trim()
    if (text.length < MIN_JD_LENGTH) {
      throw new Error(`Job description must be at least ${MIN_JD_LENGTH} characters`)
    }
    return { kind: 'text', text, sourceLabel: shortLabel(text, 'Pasted JD') }
  }
  if (input.kind === 'url') {
    const text = await fetchAndExtractText(input.value)
    if (text.length < MIN_JD_LENGTH) {
      throw new Error('Fetched page did not contain enough job description text')
    }
    return { kind: 'url', text, sourceLabel: hostnameOf(input.value) }
  }
  throw new Error('Unknown JD input kind')
}

export async function resolveCvInput(input: CvInput): Promise<ResolvedCv> {
  if (input.kind === 'text' || input.kind === 'markdown' || input.kind === 'pdf') {
    const text = input.value.trim()
    if (text.length < MIN_CV_LENGTH) {
      throw new Error('CV content is too short or could not be extracted')
    }
    const labels = { text: 'Pasted CV', markdown: 'CV (markdown)', pdf: 'CV (PDF)' } as const
    return { kind: input.kind, text, username: null, candidateLabel: labels[input.kind] }
  }
  if (input.kind === 'profile') {
    const username = input.value.trim().replace(/^@/, '')
    if (!username) throw new Error('Profile username is required')
    const dbUser = await getUserByUsername(username)
    if (!dbUser) throw new Error('Published Herald profile not found')
    if (!dbUser.onboardingComplete) throw new Error('Profile is not published')
    return {
      kind: 'profile',
      text: formatProfileAsText(dbUser),
      username,
      candidateLabel: `@${username}`
    }
  }
  throw new Error('Unknown CV input kind')
}

interface ProfileRowLike {
  name: string
  title: string
  summary: string
  stack: string
  projects: string
  experience: string
}

function formatProfileAsText(user: ProfileRowLike): string {
  const stack = safeJsonArray<string>(user.stack)
  const projects = safeJsonArray<{ title: string; description: string }>(user.projects)
  const experience = safeJsonArray<{ company: string; role: string; period: string; highlights: string[] }>(
    user.experience
  )

  const projLines = projects.map((p) => `- ${p.title}: ${p.description}`).join('\n')
  const expLines = experience
    .map((e) => `- ${e.role} at ${e.company} (${e.period})\n  ${(e.highlights ?? []).join('\n  ')}`)
    .join('\n')

  return `Name: ${user.name}
Title: ${user.title}
Summary: ${user.summary}
Skills: ${stack.join(', ')}

PROJECTS:
${projLines}

EXPERIENCE:
${expLines}`
}

function safeJsonArray<T>(s: string): T[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? (v as T[]) : []
  } catch {
    return []
  }
}

function shortLabel(s: string, fallback: string): string {
  const t = s.trim().replace(/\s+/g, ' ').slice(0, 60)
  return t.length > 0 ? t : fallback
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return 'URL'
  }
}
