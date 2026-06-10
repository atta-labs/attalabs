import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { decryptVendorKeys } from '@atta/crypto'
import { getProviderKeys } from '@atta/db/queries'
import { db } from '@/db'
import { getUserByUsername } from '@/db/queries'
import { MATCH_REPORT_SCHEMA, SKEPTICAL_AUDITOR_PROMPT } from '@/lib/prompts'
import { extractSignals } from '@/lib/signals'
import type { MatchReport } from '@/lib/types'

async function fetchSignalsWithTimeout(handle: string, timeoutMs: number): Promise<string[]> {
  const token = process.env.GITHUB_PAT
  if (!token || !handle) return []
  try {
    const signals = await Promise.race([
      extractSignals(handle, token),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ])
    return signals.map((s) => s.evidence)
  } catch {
    return []
  }
}

function buildPrompt(
  profile: {
    name: string
    title: string
    summary: string
    stack: string[]
    github: string
    projects: Array<{ title: string; description: string }>
    experience: Array<{ company: string; role: string; period: string; highlights: string[] }>
  },
  jd: string,
  signals: string[]
): string {
  const baseProfile = `CANDIDATE PROFILE:
Name: ${profile.name}
Title: ${profile.title}
Summary: ${profile.summary}
Skills: ${profile.stack.join(', ')}

PROJECTS:
${profile.projects.map((p) => `- ${p.title}: ${p.description}`).join('\n')}

EXPERIENCE:
${profile.experience.map((e) => `- ${e.role} at ${e.company} (${e.period})\n  ${e.highlights.join('\n  ')}`).join('\n')}`

  return `${baseProfile}

GITHUB SIGNALS:
${signals.length > 0 ? signals.map((s) => `- ${s}`).join('\n') : '- No GitHub signals available'}

JOB DESCRIPTION:
${jd.trim()}

Respond with valid JSON matching this schema exactly:
${MATCH_REPORT_SCHEMA}`
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

function buildPartialReport(name: string, title: string, github: string): MatchReport {
  return {
    candidate: { name, title, github },
    hard_requirements: [],
    grade: 'B+',
    recommendation: 'Good Fit',
    confidence: 'Low',
    confidence_reasoning: ['Audit timed out before full analysis could complete.'],
    signal: [],
    gaps: [{ gap: 'Incomplete analysis', severity: 'minor', mitigation: 'Re-run the audit for a complete assessment' }],
    interview_hooks: []
  }
}

async function runSingleMatch(
  username: string,
  jd: string,
  anthropic: ReturnType<typeof createAnthropic>
): Promise<{ username: string; report: MatchReport | null; error?: string }> {
  try {
    const dbUser = await getUserByUsername(username.trim())
    if (!dbUser) return { username, report: null, error: 'Profile not found' }

    const profile = {
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

    const signals = await fetchSignalsWithTimeout(profile.github, 3000)
    const userPrompt = buildPrompt(profile, jd, signals)

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
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'LLM timeout') break
      }
    }

    if (!report) report = buildPartialReport(profile.name, profile.title, profile.github)
    return { username, report }
  } catch {
    return { username, report: null, error: 'Audit failed' }
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const masterKeyB64 = process.env.MASTER_ENCRYPTION_KEY
    if (!masterKeyB64) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

    const stored = await getProviderKeys(db, userId)
    if (!stored) {
      return NextResponse.json(
        { error: 'No API key configured. Add your Anthropic key in Settings → API Keys.' },
        { status: 402 }
      )
    }

    const keys = decryptVendorKeys(
      stored.encryptedPayload as Parameters<typeof decryptVendorKeys>[0],
      userId,
      Buffer.from(masterKeyB64, 'base64')
    )
    const apiKey = keys.anthropic
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Anthropic key configured. Add your API key in Settings → API Keys.' },
        { status: 402 }
      )
    }

    const body = await request.json()
    const jd = body.jd
    const candidates = body.candidates as unknown

    if (!jd || typeof jd !== 'string' || jd.trim().length < 20) {
      return NextResponse.json({ error: 'Job description must be at least 20 characters' }, { status: 400 })
    }
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ error: 'At least one candidate username required' }, { status: 400 })
    }
    if (candidates.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 candidates per batch' }, { status: 400 })
    }

    const anthropic = createAnthropic({ apiKey })
    const results = await Promise.all(
      (candidates as string[]).map((username) => runSingleMatch(username, jd, anthropic))
    )

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[Herald] Batch route error:', err)
    return NextResponse.json({ error: 'Batch audit failed' }, { status: 500 })
  }
}
