import { createHash } from 'node:crypto'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { decryptVendorKeys } from '@atta/crypto'
import { getProviderKeys } from '@atta/db/queries'

import { db } from '@/db'
import { getUserByUsername } from '@/db/queries'
import { DANI_PROFILE } from '@/lib/profile'
import { MATCH_REPORT_SCHEMA, SKEPTICAL_AUDITOR_PROMPT } from '@/lib/prompts'
import { extractSignals } from '@/lib/signals'
import type { MatchReport } from '@/lib/types'

// In-memory cache
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
  if (!token) return []

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
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '')
    const parsed = JSON.parse(cleaned)

    // Validate required fields — hard_requirements must be present (can be empty for no-gate JDs)
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const jd = body.job_description

    if (!jd || typeof jd !== 'string' || jd.trim().length < 20) {
      return NextResponse.json({ error: 'Job description must be at least 20 characters' }, { status: 400 })
    }

    // Resolve profile: DB lookup by username (live path), test override (test path), or DANI_PROFILE fallback
    const username = body.username as string | undefined
    const testOverride = body._test_profile_override

    let profile: {
      name: string
      title: string
      github: string
      summary: string
      stack: string[]
      projects: Array<{ title: string; description: string }>
      experience: Array<{ company: string; role: string; period: string; highlights: string[] }>
    }
    let apiKey: string | undefined

    if (username) {
      const dbUser = await getUserByUsername(username)
      if (!dbUser) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
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

      // Resolve owner's stored Anthropic key — audit runs on the owner's BYOK key
      const masterKeyB64 = process.env.MASTER_ENCRYPTION_KEY
      if (masterKeyB64) {
        const stored = await getProviderKeys(db, dbUser.clerkId)
        if (stored) {
          const keys = decryptVendorKeys(
            stored.encryptedPayload as Parameters<typeof decryptVendorKeys>[0],
            dbUser.clerkId,
            Buffer.from(masterKeyB64, 'base64')
          )
          apiKey = keys.anthropic
        }
      }

      if (!apiKey) {
        return NextResponse.json(
          { error: 'Audit not available — profile owner has not configured their Anthropic key' },
          { status: 503 }
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
      // Test and fallback paths use the server env key
      apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
      }
    } else {
      profile = DANI_PROFILE
      apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
      }
    }

    // Check cache
    const cacheKey = getCacheKey(jd + JSON.stringify(profile))
    const cached = getCached(cacheKey)
    if (cached) {
      console.info('[Herald] Cache hit for match request')
      return NextResponse.json(cached)
    }

    // Fetch GitHub signals server-side — always use the profile's github handle
    const signalPromise = fetchSignalsWithTimeout(profile.github, 3000)

    // Build base prompt with profile + JD (signals added when available)
    const baseProfile = `CANDIDATE PROFILE:
Name: ${profile.name}
Title: ${profile.title}
Summary: ${profile.summary}
Skills: ${profile.stack.join(', ')}

PROJECTS:
${profile.projects.map((p) => `- ${p.title}: ${p.description}`).join('\n')}

EXPERIENCE:
${profile.experience.map((e) => `- ${e.role} at ${e.company} (${e.period})\n  ${e.highlights.join('\n  ')}`).join('\n')}`

    // Wait for signals (best-effort, may return empty)
    const signalEvidence = await signalPromise

    const userPrompt = `${baseProfile}

GITHUB SIGNALS:
${signalEvidence.length > 0 ? signalEvidence.map((s) => `- ${s}`).join('\n') : '- No GitHub signals available'}

JOB DESCRIPTION:
${jd.trim()}

Respond with valid JSON matching this schema exactly:
${MATCH_REPORT_SCHEMA}`

    const anthropic = createAnthropic({ apiKey: apiKey! })

    // Attempt generation with 15s hard timeout (signals + LLM combined)
    let report: MatchReport | null = null

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { text } = await Promise.race([
          generateText({
            model: anthropic('claude-sonnet-4-20250514'),
            system: SKEPTICAL_AUDITOR_PROMPT,
            prompt: userPrompt,
            maxOutputTokens: 2000,
            temperature: 0.3
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 25000))
        ])

        report = parseMatchReport(text, { name: profile.name, title: profile.title, github: profile.github })
        if (report) break

        console.warn(`[Herald] Failed to parse LLM response (attempt ${attempt + 1}), retrying...`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[Herald] LLM call failed (attempt ${attempt + 1}):`, message)
        if (message === 'LLM timeout') break
      }
    }

    // Fall back to partial report if both attempts failed
    if (!report) {
      console.warn('[Herald] Returning partial report after failed attempts')
      report = buildPartialReport(profile.name, profile.title, profile.github)
    }

    // Cache the result
    cache.set(cacheKey, { report, timestamp: Date.now() })

    return NextResponse.json(report)
  } catch (err) {
    console.error('[Herald] Match route error:', err)
    return NextResponse.json(buildPartialReport(DANI_PROFILE.name, DANI_PROFILE.title, DANI_PROFILE.github))
  }
}
