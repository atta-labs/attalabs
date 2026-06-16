import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { compileFlow, type Flow, loadFlow } from '@atta/engine'

import { getUserByUsername } from '@/db/queries'
import { resolveAuditCredentials, type ResolvedAuditCredentials } from '@/lib/audit-key'
import { parseMatchReport } from '@/lib/parse-match-report'
import { DANI_PROFILE } from '@/lib/profile'
import { MATCH_REPORT_SCHEMA } from '@/lib/prompts'
import { perOwnerAuditLimiter } from '@/lib/rate-limit'
import { extractSignals } from '@/lib/signals'
import type { MatchReport } from '@/lib/types'

// Resolve the auditor YAML once at module load. Path is relative to this file
// (apps/herald-ai/web/src/app/api/audit/route.ts); four ".." reach web/, then yamls/.
// Next.js traces this into the deployment via outputFileTracingIncludes.
const HERALD_AUDITOR_YAML_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../../../yamls/herald-auditor.yaml')

let cachedFlow: Flow | null = null
function getAuditorFlow(): Flow {
  if (!cachedFlow) {
    cachedFlow = loadFlow(readFileSync(HERALD_AUDITOR_YAML_PATH, 'utf-8'))
  }
  return cachedFlow
}

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

function buildPartialReport(name: string, title: string, github: string): MatchReport {
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
    interview_hooks: []
  }
}

// Per-tool-call budget for GitHub signal fetching. Kept at the same 3s as the
// retired deterministic pre-fetch so worst-case latency for the GitHub leg is
// unchanged — the agentic loop adds an extra LLM turn, not extra GitHub wait.
const GITHUB_SIGNAL_TIMEOUT_MS = 3000

// Per-attempt LLM timeout. Bumped from 25s (single-shot pre-fetch model) to
// 45s because the engine's custom-tool loop now runs at least two model turns
// per audit (turn 1: decide & emit tool_use → tool exec → turn 2: synthesize
// JSON report). 45s gives Anthropic Sonnet enough room for the second turn
// without leaving spinner-of-death risk if a vendor stalls.
const AUDIT_LLM_TIMEOUT_MS = 45000

async function fetchGithubSignalsForHandle(handle: string): Promise<string[]> {
  const token = process.env.GITHUB_PAT
  if (!token || !handle) return []

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), GITHUB_SIGNAL_TIMEOUT_MS)

    const signals = await Promise.race([
      extractSignals(handle, token),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('Signal fetch timeout')))
      })
    ])

    clearTimeout(timer)
    return signals.map((s) => s.evidence)
  } catch {
    console.warn('[Herald] GitHub signal tool timed out or failed, returning empty evidence')
    return []
  }
}

// Custom-tool handler the engine invokes when the auditor agent emits a
// `fetch_github_signals` tool_use. The model passes the candidate's
// github_handle as an argument; absence or non-string values fall through to
// the empty-handle path (returns []).
async function githubSignalToolHandler(args: Record<string, unknown>): Promise<string[]> {
  const raw = args.github_handle
  const handle = typeof raw === 'string' ? raw.trim() : ''
  return fetchGithubSignalsForHandle(handle)
}

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
// `creds` carries the vendor+modelId+apiKey to compile and dispatch with.
// Task 3b: model is the user's selected default (with auto-fallback to the
// YAML default when the selected vendor's key is missing — see resolveAuditCredentials).
async function runSingleMatch(
  profile: ResolvedProfile,
  jd: string,
  creds: ResolvedAuditCredentials
): Promise<MatchReport> {
  // Cache key includes the model id so audits run with different models
  // produce different cache entries — a user switching from Claude to GPT-5
  // should not get a Claude-cached report served back.
  const cacheKey = getCacheKey(jd + JSON.stringify(profile) + creds.vendor + creds.modelId)
  const cached = getCached(cacheKey)
  if (cached) {
    console.info('[Herald] Cache hit for audit cell')
    return cached
  }

  // 7b: GitHub signals are now gathered by the auditor agent via the
  // `fetch_github_signals` custom tool (declared in herald-auditor.yaml,
  // registered below on the adapter). The deterministic pre-fetch is retired;
  // worst-case GitHub latency is preserved by the same 3s per-call budget on
  // the handler itself. The github_handle is surfaced in the profile block so
  // the model has what it needs to call the tool.
  const githubHandleLine = profile.github
    ? `GitHub handle: ${profile.github}`
    : 'GitHub handle: (none provided — do not call fetch_github_signals)'

  const baseProfile = `CANDIDATE PROFILE:
Name: ${profile.name}
Title: ${profile.title}
${githubHandleLine}
Summary: ${profile.summary}
Skills: ${profile.stack.join(', ')}

PROJECTS:
${profile.projects.map((p) => `- ${p.title}: ${p.description}`).join('\n')}

EXPERIENCE:
${profile.experience.map((e) => `- ${e.role} at ${e.company} (${e.period})\n  ${e.highlights.join('\n  ')}`).join('\n')}`

  const userPrompt = `${baseProfile}

JOB DESCRIPTION:
${jd.trim()}`

  const flow = getAuditorFlow()
  // Pass the resolved model into compileFlow so the user's selection wins
  // over flow.defaults.model (engine respects an explicit override).
  const plan = compileFlow(flow, userPrompt, creds.modelId, { schema: MATCH_REPORT_SCHEMA })
  // Register the GitHub-signal handler so the engine's custom-tool loop activates
  // when the auditor agent emits a `fetch_github_signals` tool_use block (gated
  // by resolveRegisteredCustomTools — keyed on the name declared in the YAML).
  const adapter = new LangGraphAdapter({
    providerKeys: { [creds.vendor]: creds.apiKey },
    customTools: { fetch_github_signals: githubSignalToolHandler }
  })

  let report: MatchReport | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const conclusion = await Promise.race([
        adapter.execute({ plan }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), AUDIT_LLM_TIMEOUT_MS))
      ])

      if (conclusion.terminalState === 'FAILED') {
        console.warn(`[Herald] Engine returned FAILED (attempt ${attempt + 1}):`, conclusion.error ?? 'unknown')
        continue
      }

      report = parseMatchReport(conclusion.content, {
        name: profile.name,
        title: profile.title,
        github: profile.github
      })
      if (report) break

      console.warn(`[Herald] Failed to parse LLM response (attempt ${attempt + 1}), retrying...`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[Herald] LLM call failed (attempt ${attempt + 1}):`, message)
      if (message === 'LLM timeout') break
    }
  }

  if (!report) {
    console.warn('[Herald] Returning partial report after failed attempts')
    report = buildPartialReport(profile.name, profile.title, profile.github)
  }

  cache.set(cacheKey, { report, timestamp: Date.now() })
  return report
}

// Fallback credentials for the unauthenticated "demo" and test paths that
// don't have a per-user store to read from. Uses the server-side env key on
// the YAML default model (current behavior preserved).
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

    // Per-owner audit cap (D-033 abuse hole). Profile audits spend the
    // owner's BYOK key; without this cap, distributed callers (rotating IPs)
    // can drain the owner's budget even with the per-IP limit in proxy.ts.
    // Keyed on the owner's clerkId. Fail-open on limiter error, exactly like
    // the per-IP limiter — today's Upstash creds are expired, enforcement
    // goes live when they're refreshed.
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

    // Profile audits run on the owner's BYOK key (D-033). The selected
    // model + vendor come from the owner's per-user preference, with
    // auto-fallback to the YAML default if their stored selection's vendor
    // key was revoked.
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

// Batch shape accepts a polymorphic candidates array. Each entry is either a
// legacy username string or a discriminated-union object.
//   - string                                     → look up published Herald profile
//   - { kind: 'username', value: string }        → same as the string form (explicit)
//   - { kind: 'text', label: string, text: string }
//       → ad-hoc CV (pasted text, .md upload, .pdf upload — all normalised to text
//         by the polymorphic input layer in BulkAudit / /api/audit/resolve-input)
//
// Every entry runs through runSingleMatch with the SAME `creds` resolved from
// the logged-in user (D-033). Ad-hoc text CVs were previously routed through
// the single-shape _test_profile_override hatch, which fell back to the server
// ANTHROPIC_API_KEY env var — that bypassed user BYOK and was the gap flagged
// in PR #123's review.
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

  // Bulk Audit runs on the logged-in user's BYOK key (D-033). Vendor + model
  // come from their per-user preference (auto-fallback to the YAML default).
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

  // Dispatch on payload shape: batch carries a `candidates` array; single does not.
  const isBatch = Array.isArray(body.candidates)

  try {
    if (isBatch) return await handleBatch(body)
    return await handleSingle(body)
  } catch (err) {
    console.error('[Herald] Audit route error:', err)
    if (isBatch) {
      return NextResponse.json({ error: 'Batch audit failed' }, { status: 500 })
    }
    return NextResponse.json(buildPartialReport(DANI_PROFILE.name, DANI_PROFILE.title, DANI_PROFILE.github))
  }
}
