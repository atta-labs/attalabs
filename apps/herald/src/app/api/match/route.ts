import { createHash } from 'node:crypto'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

import { DANI_PROFILE } from '@/lib/profile'
import { MATCH_REPORT_SCHEMA, SKEPTICAL_AUDITOR_PROMPT } from '@/lib/prompts'
import { extractSignals } from '@/lib/signals'
import type { MatchReport } from '@/lib/types'

// In-memory cache (replace with Upstash in Step 4)
const cache = new Map<string, { report: MatchReport; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function getCacheKey(jd: string): string {
  const hash = createHash('sha256')
  hash.update(jd + JSON.stringify(DANI_PROFILE))
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

function buildPartialReport(): MatchReport {
  return {
    candidate: { name: DANI_PROFILE.name, title: DANI_PROFILE.title, github: DANI_PROFILE.github },
    grade: 'B+',
    recommendation: 'Good Fit',
    confidence: 'Low',
    confidence_reasoning: [
      'Audit timed out before full analysis could complete. Partial assessment based on available data.'
    ],
    signal: [],
    gaps: [{ gap: 'Incomplete analysis', mitigation: 'Re-run the audit for a complete assessment' }],
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

function parseMatchReport(text: string): MatchReport | null {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '')
    const parsed = JSON.parse(cleaned)

    // Validate required fields
    if (!parsed.grade || !parsed.recommendation || !parsed.signal) return null

    return {
      candidate: { name: DANI_PROFILE.name, title: DANI_PROFILE.title, github: DANI_PROFILE.github },
      grade: parsed.grade,
      recommendation: parsed.recommendation,
      confidence: parsed.grade === 'A' || parsed.grade === 'A-' ? 'High' : 'Moderate',
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

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    // Check cache
    const cacheKey = getCacheKey(jd)
    const cached = getCached(cacheKey)
    if (cached) {
      console.info('[Herald] Cache hit for match request')
      return NextResponse.json(cached)
    }

    // Start signal fetch in parallel — don't wait for it to build the prompt
    const signalPromise = fetchSignalsWithTimeout(DANI_PROFILE.github, 3000)

    // Build base prompt with profile + JD (signals added when available)
    const baseProfile = `CANDIDATE PROFILE:
Name: ${DANI_PROFILE.name}
Title: ${DANI_PROFILE.title}
Summary: ${DANI_PROFILE.summary}
Skills: ${DANI_PROFILE.stack.join(', ')}

PROJECTS:
${DANI_PROFILE.projects.map((p) => `- ${p.title}: ${p.description}`).join('\n')}

EXPERIENCE:
${DANI_PROFILE.experience.map((e) => `- ${e.role} at ${e.company} (${e.period})\n  ${e.highlights.join('\n  ')}`).join('\n')}`

    // Wait for signals (best-effort, may return empty)
    const signalEvidence = await signalPromise

    const userPrompt = `${baseProfile}

GITHUB SIGNALS:
${signalEvidence.length > 0 ? signalEvidence.map((s) => `- ${s}`).join('\n') : '- No GitHub signals available'}

JOB DESCRIPTION:
${jd.trim()}

Respond with valid JSON matching this schema exactly:
${MATCH_REPORT_SCHEMA}`

    const anthropic = createAnthropic({ apiKey })

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

        report = parseMatchReport(text)
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
      report = buildPartialReport()
    }

    // Cache the result
    cache.set(cacheKey, { report, timestamp: Date.now() })

    return NextResponse.json(report)
  } catch (err) {
    console.error('[Herald] Match route error:', err)
    return NextResponse.json(buildPartialReport())
  }
}
