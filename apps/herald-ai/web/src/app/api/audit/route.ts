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

async function fetchSignalsWithTimeout(handle: string, timeoutMs: number): Promise<string[]> {
  const token = process.env.GITHUB_PAT
  if (!token || !handle) return []

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const signals = await Promise.race([
      extractSignals(handle, token),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('Signal fetch timeout')))
      })
    ])

    clearTimeout(timer)
    return signals.map((s) => s.evidence)
  } catch {
    console.warn('[Herald] Signal fetch timed out or failed, proceeding without signals')
    return []
  }
}

function parseMatchReport(
  text: string,
  candidateInfo: { name: string; title: string; github: string }
): MatchReport | null {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '')
    const parsed = JSON.parse(cleaned)

    if (!parsed.grade || !parsed.recommendation || !parsed.signal) return null
    if (!Array.isArray(parsed.hard_requirements)) return null

    // Code-enforced NO FIT gate — model cannot override this
    const failedHardGate = parsed.hard_requirements.some(
      (r: { kind: string; met: boolean }) => r.kind === 'hard' && !r.met
    )
    const grade = failedHardGate ? 'NO FIT' : parsed.grade
    const recommendation = failedHardGate ? 'No Fit' : parsed.recommendation
    const confidence = grade === 'NO FIT' ? 'High' : grade === 'A' || grade === 'A-' ? 'High' : 'Moderate'

    return {
      candidate: candidateInfo,
      hard_requirements: parsed.hard_requirements,
      grade,
      recommendation,
      confidence,
      confidence_reasoning: parsed.confidence_reasoning ?? [],
      signal: parsed.signal ?? [],
      gaps: parsed.gaps ?? [],
      interview_hooks: parsed.interview_hooks ?? []
    }
  } catch {
    return null
  }
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

  const signalPromise = fetchSignalsWithTimeout(profile.github, 3000)

  const baseProfile = `CANDIDATE PROFILE:
Name: ${profile.name}
Title: ${profile.title}
Summary: ${profile.summary}
Skills: ${profile.stack.join(', ')}

PROJECTS:
${profile.projects.map((p) => `- ${p.title}: ${p.description}`).join('\n')}

EXPERIENCE:
${profile.experience.map((e) => `- ${e.role} at ${e.company} (${e.period})\n  ${e.highlights.join('\n  ')}`).join('\n')}`

  const signalEvidence = await signalPromise

  const userPrompt = `${baseProfile}

GITHUB SIGNALS:
${signalEvidence.length > 0 ? signalEvidence.map((s) => `- ${s}`).join('\n') : '- No GitHub signals available'}

JOB DESCRIPTION:
${jd.trim()}`

  const flow = getAuditorFlow()
  // Pass the resolved model into compileFlow so the user's selection wins
  // over flow.defaults.model (engine respects an explicit override).
  const plan = compileFlow(flow, userPrompt, creds.modelId, { schema: MATCH_REPORT_SCHEMA })
  const adapter = new LangGraphAdapter({ providerKeys: { [creds.vendor]: creds.apiKey } })

  let report: MatchReport | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const conclusion = await Promise.race([
        adapter.execute({ plan }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 25000))
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
    modelId: 'claude-sonnet-4-20250514',
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
    return NextResponse.json({ error: 'At least one candidate username required' }, { status: 400 })
  }
  if (candidates.length > 10) {
    return NextResponse.json({ error: 'Maximum 10 candidates per batch' }, { status: 400 })
  }

  const results = await Promise.all(
    (candidates as string[]).map(async (username) => {
      try {
        const dbUser = await getUserByUsername(username.trim())
        if (!dbUser) return { username, report: null, error: 'Profile not found' }
        const profile: ResolvedProfile = {
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
        const report = await runSingleMatch(profile, jd, creds)
        return { username, report }
      } catch {
        return { username, report: null, error: 'Audit failed' }
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
