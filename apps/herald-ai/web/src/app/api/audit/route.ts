import { createHash } from 'node:crypto'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { run, type RunAuditFailure } from '@atta/forensic-hiring-auditor'

import { getUserByUsername } from '@/db/queries'
import { resolveAuditCredentials, type ResolvedAuditCredentials } from '@/lib/audit-key'
import { DANI_PROFILE } from '@/lib/profile'
import { MATCH_REPORT_SCHEMA } from '@/lib/prompts'
import { perOwnerAuditLimiter } from '@/lib/rate-limit'
import type { MatchReport } from '@/lib/types'

// In-memory cache shared across both call shapes — keyed on JD + profile.
const cache = new Map<string, { report: MatchReport; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function getCacheKey(input: string): string {
  const hash = createHash('sha256')
  hash.update(input)
  return hash.digest('hex')
}

function getCached(key: string): MatchReport | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.report
}

function isRunAuditFailure(x: unknown): x is RunAuditFailure {
  return typeof x === 'object' && x !== null && 'failed' in x && (x as RunAuditFailure).failed === true
}

type AuditFailureCategory = 'quota' | 'timeout' | 'auth' | 'unknown'

// Simple string-matching over the real error message. Good enough for the
// major vendor failure modes; falls back to 'unknown' rather than guessing.
function categorizeFailure(reason: string | null): AuditFailureCategory {
  if (!reason) return 'unknown'
  const lower = reason.toLowerCase()
  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('rate-limit')
  ) {
    return 'quota'
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'timeout'
  }
  if (
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('invalid api key') ||
    lower.includes('authentication')
  ) {
    return 'auth'
  }
  return 'unknown'
}

function buildPartialReport(name: string, title: string, github: string, failureReason: string | null): MatchReport {
  return {
    candidate: { name, title, github },
    hard_requirements: [],
    grade: 'B+',
    recommendation: 'Good Fit',
    confidence: 'Low',
    confidence_reasoning: [
      'Audit timed out before full analysis could complete. Partial assessment based on available data.'
    ],
    signal: [],
    gaps: [{ gap: 'Incomplete analysis', severity: 'minor', mitigation: 'Re-run the audit for a complete assessment' }],
    interview_hooks: [],
    auditFailed: {
      reason: failureReason ?? 'Audit execution failed for an unknown reason',
      category: categorizeFailure(failureReason)
    }
  }
}

// Per-attempt LLM timeout. History:
//   25s → 45s (task 7b) when the custom-tool loop made the audit a 2-turn dialogue.
//   45s → 90s (this PR) once defaults.max_tokens rose 2000 → 8000.
const AUDIT_LLM_TIMEOUT_MS = 90000

interface ResolvedProfile {
  name: string
  title: string
  github: string
  summary: string
  stack: string[]
  projects: Array<{ title: string; description: string }>
  experience: Array<{ company: string; role: string; period: string; highlights: string[] }>
}

// Engine-backed audit cell — single unit of work shared by single and batch shapes.
async function runSingleMatch(
  profile: ResolvedProfile,
  jd: string,
  creds: ResolvedAuditCredentials
): Promise<MatchReport> {
  const cacheKey = getCacheKey(jd + JSON.stringify(profile) + creds.vendor + creds.modelId)
  const cached = getCached(cacheKey)
  if (cached) {
    console.info('[Herald] Cache hit for audit cell')
    return cached
  }

  const githubHandleLine = profile.github
    ? `GitHub handle: ${profile.github}`
    : 'GitHub handle: (none provided — do not call fetch_github_signals)'

  const userPrompt = `CANDIDATE PROFILE:
Name: ${profile.name}
Title: ${profile.title}
${githubHandleLine}
Summary: ${profile.summary}
Skills: ${profile.stack.join(', ')}

PROJECTS:
${profile.projects.map((p) => `- ${p.title}: ${p.description}`).join('\n')}

EXPERIENCE:
${profile.experience.map((e) => `- ${e.role} at ${e.company} (${e.period})\n  ${e.highlights.join('\n  ')}`).join('\n')}

JOB DESCRIPTION:
${jd.trim()}`

  let report: MatchReport | null = null
  let failureReason: string | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await Promise.race([
        run({
          profile: userPrompt,
          modelId: creds.modelId,
          vendor: creds.vendor,
          apiKey: creds.apiKey,
          schema: MATCH_REPORT_SCHEMA,
          candidateInfo: { name: profile.name, title: profile.title, github: profile.github },
          onParseFailure: ({ reason, head, tail }) => {
            console.warn(`[Herald] parseMatchReport rejected response (attempt ${attempt + 1}): ${reason}`)
            console.warn(`[Herald]   head: ${head}`)
            console.warn(`[Herald]   tail: ${tail}`)
          }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), AUDIT_LLM_TIMEOUT_MS))
      ])

      if (isRunAuditFailure(result)) {
        console.warn(`[Herald] run() reported execution failure (attempt ${attempt + 1}): ${result.reason}`)
        failureReason = result.reason
        continue
      }

      if (!result) {
        console.warn(`[Herald] run() returned null (attempt ${attempt + 1}), retrying...`)
        continue
      }

      report = result
      failureReason = null
      break
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[Herald] LLM call failed (attempt ${attempt + 1}):`, message)
      failureReason = message
      if (message === 'LLM timeout') break
    }
  }

  // Only real reports get cached — partial fallbacks are computed fresh on every retry.
  let isPartial = false
  if (!report) {
    console.warn('[Herald] Returning partial report after failed attempts')
    report = buildPartialReport(profile.name, profile.title, profile.github, failureReason)
    isPartial = true
  }

  if (!isPartial) {
    cache.set(cacheKey, { report, timestamp: Date.now() })
  }
  return report
}

function envFallbackCreds(): ResolvedAuditCredentials | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  return {
    vendor: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    apiKey,
    fellBackFromSelection: false
  }
}

async function handleSingle(body: Record<string, unknown>): Promise<NextResponse> {
  const jd = body.job_description
  if (!jd || typeof jd !== 'string' || jd.trim().length < 20) {
    return NextResponse.json({ error: 'Job description must be at least 20 characters' }, { status: 400 })
  }

  const username = typeof body.username === 'string' ? body.username : undefined
  const testOverride = body._test_profile_override as Record<string, unknown> | undefined

  let profile: ResolvedProfile
  let creds: ResolvedAuditCredentials | null

  if (username) {
    const dbUser = await getUserByUsername(username)
    if (!dbUser) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (perOwnerAuditLimiter) {
      try {
        const { success } = await perOwnerAuditLimiter.limit(dbUser.clerkId)
        if (!success) {
          return NextResponse.json(
            { error: 'This profile has received many audits recently. Try again in an hour.' },
            { status: 429 }
          )
        }
      } catch {
        console.warn('[Herald] Per-owner rate limit check failed — allowing request')
      }
    }

    profile = {
      name: dbUser.name,
      title: dbUser.title,
      github: dbUser.githubHandle ?? '',
      summary: dbUser.summary,
      stack: JSON.parse(dbUser.stack) as string[],
      projects: JSON.parse(dbUser.projects) as Array<{ title: string; description: string }>,
      experience: JSON.parse(dbUser.experience) as Array<{
        company: string
        role: string
        period: string
        highlights: string[]
      }>
    }

    creds = await resolveAuditCredentials(dbUser.clerkId)
    if (!creds) {
      return NextResponse.json(
        { error: 'Audit not available — profile owner has not configured an API key' },
        { status: 503 }
      )
    }
    if (creds.fellBackFromSelection) {
      console.info(
        `[Herald] Audit for ${username}: selected model unavailable (vendor key missing), falling back to ${creds.vendor}/${creds.modelId}`
      )
    }
  } else if (testOverride) {
    profile = {
      name: testOverride.name as string,
      title: testOverride.title as string,
      summary: testOverride.summary as string,
      stack: testOverride.stack as string[],
      projects: testOverride.projects as Array<{ title: string; description: string }>,
      experience: testOverride.experience as Array<{
        company: string
        role: string
        period: string
        highlights: string[]
      }>,
      github: (testOverride.github as string) ?? ''
    }
    creds = envFallbackCreds()
    if (!creds) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }
  } else {
    profile = DANI_PROFILE
    creds = envFallbackCreds()
    if (!creds) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }
  }

  const report = await runSingleMatch(profile, jd, creds)
  return NextResponse.json(report)
}

type BatchCandidate = string | { kind: 'username'; value: string } | { kind: 'text'; label: string; text: string }

interface NormalisedCandidate {
  kind: 'username' | 'text'
  label: string
  username?: string
  text?: string
}

function normaliseBatchCandidate(raw: unknown, fallbackLabel: string): NormalisedCandidate | null {
  if (typeof raw === 'string') {
    const username = raw.trim()
    if (!username) return null
    return { kind: 'username', label: `@${username}`, username }
  }
  if (raw && typeof raw === 'object') {
    const rec = raw as { kind?: unknown; value?: unknown; text?: unknown; label?: unknown }
    if (rec.kind === 'username' && typeof rec.value === 'string') {
      const username = rec.value.trim()
      if (!username) return null
      return { kind: 'username', label: `@${username}`, username }
    }
    if (rec.kind === 'text' && typeof rec.text === 'string') {
      const text = rec.text.trim()
      if (text.length < 50) return null
      const label = typeof rec.label === 'string' && rec.label.length > 0 ? rec.label : fallbackLabel
      return { kind: 'text', label, text }
    }
  }
  return null
}

function syntheticProfileFromText(label: string, text: string): ResolvedProfile {
  return {
    name: label,
    title: '',
    github: '',
    summary: text,
    stack: [],
    projects: [],
    experience: []
  }
}

async function handleBatch(body: Record<string, unknown>): Promise<NextResponse> {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creds = await resolveAuditCredentials(userId)
  if (!creds) {
    return NextResponse.json(
      { error: 'No API key configured. Add a vendor key in Settings → API Keys.' },
      { status: 402 }
    )
  }
  if (creds.fellBackFromSelection) {
    console.info(
      `[Herald] Batch audit: selected model unavailable (vendor key missing), falling back to ${creds.vendor}/${creds.modelId}`
    )
  }

  const jd = body.jd
  const candidates = body.candidates

  if (!jd || typeof jd !== 'string' || jd.trim().length < 20) {
    return NextResponse.json({ error: 'Job description must be at least 20 characters' }, { status: 400 })
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ error: 'At least one candidate required' }, { status: 400 })
  }
  if (candidates.length > 10) {
    return NextResponse.json({ error: 'Maximum 10 candidates per batch' }, { status: 400 })
  }

  const rawCandidates = candidates as BatchCandidate[]
  const normalised: Array<{ candidate: NormalisedCandidate; rawIndex: number } | { error: string; rawIndex: number }> =
    rawCandidates.map((raw, idx) => {
      const c = normaliseBatchCandidate(raw, `Candidate ${idx + 1}`)
      if (!c) return { error: 'Invalid candidate entry', rawIndex: idx }
      return { candidate: c, rawIndex: idx }
    })

  const results = await Promise.all(
    normalised.map(async (entry) => {
      if ('error' in entry) {
        return { username: `Candidate ${entry.rawIndex + 1}`, report: null, error: entry.error }
      }
      const { candidate } = entry
      try {
        let profile: ResolvedProfile
        if (candidate.kind === 'username' && candidate.username) {
          const dbUser = await getUserByUsername(candidate.username)
          if (!dbUser) return { username: candidate.label, report: null, error: 'Profile not found' }
          profile = {
            name: dbUser.name,
            title: dbUser.title,
            github: dbUser.githubHandle ?? '',
            summary: dbUser.summary,
            stack: JSON.parse(dbUser.stack) as string[],
            projects: JSON.parse(dbUser.projects) as Array<{ title: string; description: string }>,
            experience: JSON.parse(dbUser.experience) as Array<{
              company: string
              role: string
              period: string
              highlights: string[]
            }>
          }
        } else if (candidate.kind === 'text' && candidate.text) {
          profile = syntheticProfileFromText(candidate.label, candidate.text)
        } else {
          return { username: candidate.label, report: null, error: 'Invalid candidate entry' }
        }
        const report = await runSingleMatch(profile, jd, creds)
        return { username: candidate.label, report }
      } catch {
        return { username: candidate.label, report: null, error: 'Audit failed' }
      }
    })
  )

  return NextResponse.json({ results })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const isBatch = Array.isArray(body.candidates)

  try {
    if (isBatch) return await handleBatch(body)
    return await handleSingle(body)
  } catch (err) {
    console.error('[Herald] Audit route error:', err)
    if (isBatch) {
      return NextResponse.json({ error: 'Batch audit failed' }, { status: 500 })
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(buildPartialReport(DANI_PROFILE.name, DANI_PROFILE.title, DANI_PROFILE.github, message))
  }
}
