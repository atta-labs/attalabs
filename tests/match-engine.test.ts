// Herald Match Engine — Grading Consistency Test Suite
//
// First run: ~$0.15 in API calls (each profile+JD calls Claude once)
// Every subsequent run: reads from cache, free
//
// Run with: bun test tests/match-engine.test.ts
// Requires: dev server running at localhost:3000

import { describe, expect, it } from 'bun:test'
import {
  COMPLETELY_IRRELEVANT,
  FULL_STACK_JD,
  JUNIOR_FRONTEND,
  SENIOR_BACKEND_NODE,
  SENIOR_FRONTEND_NO_WEB3,
  SENIOR_FRONTEND_WEB3,
  type TestJD
} from './fixtures/jds'
import { JUNIOR, PARTIAL_MATCH, PERFECT_MATCH, type TestProfile, WRONG_SPECIALTY } from './fixtures/profiles'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

interface MatchReport {
  grade: 'A' | 'A-' | 'B+' | 'B'
  recommendation: string
  confidence: string
  confidence_reasoning: string[]
  signal: Array<{ title: string; observation: string; interpretation: string; confidence: string }>
  gaps: Array<{ gap: string; mitigation: string }>
  interview_hooks: string[]
}

const GRADE_ORDER: Record<string, number> = { A: 4, 'A-': 3, 'B+': 2, B: 1 }

async function runMatch(profile: TestProfile | null, jd: TestJD): Promise<MatchReport> {
  const body: Record<string, unknown> = { job_description: jd.content }
  if (profile) {
    body._test_profile_override = {
      name: profile.name,
      title: profile.title,
      summary: profile.summary,
      stack: profile.stack,
      projects: profile.projects,
      experience: profile.experience,
      github_signal: profile.github_signal
    }
  }

  const res = await fetch(`${BASE_URL}/api/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<MatchReport>
}

function assertStructure(report: MatchReport, label: string) {
  expect(['A', 'A-', 'B+', 'B'].includes(report.grade), `${label}: invalid grade "${report.grade}"`).toBe(true)

  expect(report.confidence_reasoning.length, `${label}: must have confidence reasoning`).toBeGreaterThan(0)

  // No marketing language
  const allText = [
    ...report.confidence_reasoning,
    ...report.signal.map((s) => s.observation + ' ' + s.interpretation),
    ...report.gaps.map((g) => g.gap + ' ' + g.mitigation),
    ...report.interview_hooks
  ]
    .join(' ')
    .toLowerCase()

  for (const word of ['passionate', 'innovative', 'rockstar', 'ninja', 'guru', 'self-starter']) {
    expect(allText.includes(word), `${label}: banned word "${word}"`).toBe(false)
  }

  // Interview hooks must be specific (>8 words each)
  expect(report.interview_hooks.length, `${label}: need 2+ hooks`).toBeGreaterThanOrEqual(2)
  for (const hook of report.interview_hooks) {
    expect(hook.split(' ').length, `${label}: hook too short: "${hook}"`).toBeGreaterThan(8)
  }

  // Non-A grades must have gaps
  if (report.grade !== 'A') {
    expect(report.gaps.length, `${label}: non-A grade needs gaps`).toBeGreaterThan(0)
  }

  // Every gap has mitigation
  for (const gap of report.gaps) {
    expect(gap.mitigation.length, `${label}: gap "${gap.gap}" needs mitigation`).toBeGreaterThan(0)
  }
}

// ── Dani (baseline — uses real profile, no override) ──

describe('Dani (baseline)', () => {
  it('A or A- on Senior Frontend Web3', async () => {
    const r = await runMatch(null, SENIOR_FRONTEND_WEB3)
    assertStructure(r, 'Dani/FE-Web3')
    expect(GRADE_ORDER[r.grade]! >= GRADE_ORDER['A-']!, `Expected A or A-, got ${r.grade}`).toBe(true)
  }, 60000)

  it('B on Senior Backend Node.js', async () => {
    const r = await runMatch(null, SENIOR_BACKEND_NODE)
    assertStructure(r, 'Dani/Backend')
    expect(GRADE_ORDER[r.grade]! <= GRADE_ORDER['B+']!, `Expected B or B+, got ${r.grade}`).toBe(true)
  }, 60000)

  it('B on irrelevant Rust role', async () => {
    const r = await runMatch(null, COMPLETELY_IRRELEVANT)
    assertStructure(r, 'Dani/Rust')
    expect(r.grade).toBe('B')
    expect(r.gaps.length).toBeGreaterThanOrEqual(3)
  }, 60000)
})

// ── Perfect Match ──

describe('Perfect Match (Alex Chen)', () => {
  it('A or A- on Senior Frontend Web3', async () => {
    const r = await runMatch(PERFECT_MATCH, SENIOR_FRONTEND_WEB3)
    assertStructure(r, 'Alex/FE-Web3')
    expect(GRADE_ORDER[r.grade]! >= GRADE_ORDER['A-']!).toBe(true)
  }, 60000)

  it('B or B+ on Backend Node.js (wrong specialty)', async () => {
    const r = await runMatch(PERFECT_MATCH, SENIOR_BACKEND_NODE)
    assertStructure(r, 'Alex/Backend')
    expect(GRADE_ORDER[r.grade]! <= GRADE_ORDER['B+']!).toBe(true)
  }, 60000)
})

// ── Partial Match ──

describe('Partial Match (Sarah Kim)', () => {
  it('B+ or lower on Senior Frontend Web3 (no Web3)', async () => {
    const r = await runMatch(PARTIAL_MATCH, SENIOR_FRONTEND_WEB3)
    assertStructure(r, 'Sarah/FE-Web3')
    expect(GRADE_ORDER[r.grade]! <= GRADE_ORDER['B+']!).toBe(true)
    const gapText = r.gaps.map((g) => g.gap.toLowerCase()).join(' ')
    expect(gapText.includes('web3') || gapText.includes('blockchain') || gapText.includes('wagmi')).toBe(true)
  }, 60000)
})

// ── Wrong Specialty ──

describe('Wrong Specialty (Marco Silva — Backend)', () => {
  it('A or A- on Backend Node.js', async () => {
    const r = await runMatch(WRONG_SPECIALTY, SENIOR_BACKEND_NODE)
    assertStructure(r, 'Marco/Backend')
    expect(GRADE_ORDER[r.grade]! >= GRADE_ORDER['A-']!).toBe(true)
  }, 60000)

  it('B or B+ on Frontend Web3 (no frontend)', async () => {
    const r = await runMatch(WRONG_SPECIALTY, SENIOR_FRONTEND_WEB3)
    assertStructure(r, 'Marco/FE-Web3')
    expect(GRADE_ORDER[r.grade]! <= GRADE_ORDER['B+']!).toBe(true)
  }, 60000)
})

// ── Junior ──

describe('Junior (Tom Walker)', () => {
  it('B on Senior Frontend Web3', async () => {
    const r = await runMatch(JUNIOR, SENIOR_FRONTEND_WEB3)
    assertStructure(r, 'Tom/FE-Web3')
    expect(r.grade).toBe('B')
  }, 60000)

  it('B+ or better on Junior Frontend (right level)', async () => {
    const r = await runMatch(JUNIOR, JUNIOR_FRONTEND)
    assertStructure(r, 'Tom/Junior')
    expect(GRADE_ORDER[r.grade]! >= GRADE_ORDER['B+']!).toBe(true)
  }, 60000)
})

// ── Cross-profile consistency ──

describe('Grade Consistency', () => {
  it('Perfect Match grades higher than Junior on same Web3 JD', async () => {
    const [perfect, junior] = await Promise.all([
      runMatch(PERFECT_MATCH, SENIOR_FRONTEND_WEB3),
      runMatch(JUNIOR, SENIOR_FRONTEND_WEB3)
    ])
    expect(
      GRADE_ORDER[perfect.grade]! > GRADE_ORDER[junior.grade]!,
      `Perfect (${perfect.grade}) should beat Junior (${junior.grade})`
    ).toBe(true)
  }, 120000)

  it('Backend specialist grades higher than Junior on Backend JD', async () => {
    const [backend, junior] = await Promise.all([
      runMatch(WRONG_SPECIALTY, SENIOR_BACKEND_NODE),
      runMatch(JUNIOR, SENIOR_BACKEND_NODE)
    ])
    expect(
      GRADE_ORDER[backend.grade]! > GRADE_ORDER[junior.grade]!,
      `Backend (${backend.grade}) should beat Junior (${junior.grade})`
    ).toBe(true)
  }, 120000)
})

// ── Edge cases ──

describe('Edge Cases', () => {
  it('handles minimal JD', async () => {
    const minimal: TestJD = {
      id: 'minimal',
      title: 'React Dev',
      content: 'Looking for a React developer with TypeScript experience for a SaaS product.'
    }
    const r = await runMatch(null, minimal)
    assertStructure(r, 'Dani/Minimal')
    expect(['A', 'A-', 'B+', 'B'].includes(r.grade)).toBe(true)
  }, 60000)

  it('cached call is faster than first call', async () => {
    // First call (may already be cached from earlier test)
    const start1 = Date.now()
    await runMatch(null, SENIOR_FRONTEND_NO_WEB3)
    const first = Date.now() - start1

    // Second call (definitely cached now)
    const start2 = Date.now()
    await runMatch(null, SENIOR_FRONTEND_NO_WEB3)
    const second = Date.now() - start2

    expect(second < first || second < 1000, `Cache: second (${second}ms) should be fast`).toBe(true)
  }, 60000)
})
