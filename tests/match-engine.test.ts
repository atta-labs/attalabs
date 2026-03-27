// Herald Match Engine — Grading Consistency Test Suite
//
// First run: ~$0.15 in API calls (each profile+JD calls Claude once)
// Every subsequent run: reads from cache, free
//
// Run with: bun test tests/match-engine.test.ts
// Requires: dev server running at localhost:3000

import { describe, expect, it } from 'bun:test'
import {
  COMMERCIAL_PILOT,
  COMPLETELY_IRRELEVANT,
  CORPORATE_LAWYER,
  HOTEL_GENERAL_MANAGER,
  JUNIOR_FRONTEND,
  LEAD_MAKEUP_ARTIST,
  SENIOR_BACKEND_NODE,
  SENIOR_FRONTEND_NO_WEB3,
  SENIOR_FRONTEND_WEB3,
  SENIOR_PRODUCT_DESIGNER,
  type TestJD
} from './fixtures/jds'
import {
  HOSPITALITY_MANAGER,
  JUNIOR,
  LAWYER,
  MAKEUP_ARTIST,
  PARTIAL_MATCH,
  PERFECT_MATCH,
  PILOT,
  PRODUCT_DESIGNER,
  type TestProfile,
  WRONG_SPECIALTY
} from './fixtures/profiles'

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
    ...report.signal.map((s) => `${s.observation} ${s.interpretation}`),
    ...report.gaps.map((g) => `${g.gap} ${g.mitigation}`),
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

// ── Non-tech profiles: right-field matches ──

describe('Product Designer (Mia Torres)', () => {
  it('A or A- on Product Designer role (right field)', async () => {
    const r = await runMatch(PRODUCT_DESIGNER, SENIOR_PRODUCT_DESIGNER)
    assertStructure(r, 'Mia/Designer')
    expect(GRADE_ORDER[r.grade]! >= GRADE_ORDER['A-']!).toBe(true)
  }, 60000)

  it('B on Senior Frontend Web3 (wrong field)', async () => {
    const r = await runMatch(PRODUCT_DESIGNER, SENIOR_FRONTEND_WEB3)
    assertStructure(r, 'Mia/FE-Web3')
    expect(GRADE_ORDER[r.grade]! <= GRADE_ORDER['B+']!).toBe(true)
  }, 60000)
})

describe('Makeup Artist (Luna Vasquez)', () => {
  it('A or A- on Lead Makeup Artist role (right field)', async () => {
    const r = await runMatch(MAKEUP_ARTIST, LEAD_MAKEUP_ARTIST)
    assertStructure(r, 'Luna/Makeup')
    expect(GRADE_ORDER[r.grade]! >= GRADE_ORDER['A-']!).toBe(true)
  }, 60000)

  it('B on Senior Frontend Web3 (completely wrong field)', async () => {
    const r = await runMatch(MAKEUP_ARTIST, SENIOR_FRONTEND_WEB3)
    assertStructure(r, 'Luna/FE-Web3')
    expect(r.grade).toBe('B')
    expect(r.gaps.length).toBeGreaterThanOrEqual(3)
  }, 60000)

  it('B on Corporate Lawyer role (wrong field)', async () => {
    const r = await runMatch(MAKEUP_ARTIST, CORPORATE_LAWYER)
    assertStructure(r, 'Luna/Lawyer')
    expect(r.grade).toBe('B')
  }, 60000)
})

describe('Pilot (James Okonkwo)', () => {
  it('A or A- on Commercial Pilot role (right field)', async () => {
    const r = await runMatch(PILOT, COMMERCIAL_PILOT)
    assertStructure(r, 'James/Pilot')
    expect(GRADE_ORDER[r.grade]! >= GRADE_ORDER['A-']!).toBe(true)
  }, 60000)

  it('B on Hotel GM role (wrong field)', async () => {
    const r = await runMatch(PILOT, HOTEL_GENERAL_MANAGER)
    assertStructure(r, 'James/Hotel')
    expect(r.grade).toBe('B')
  }, 60000)
})

describe('Lawyer (Elena Petrova)', () => {
  it('A or A- on Corporate Lawyer role (right field)', async () => {
    const r = await runMatch(LAWYER, CORPORATE_LAWYER)
    assertStructure(r, 'Elena/Lawyer')
    expect(GRADE_ORDER[r.grade]! >= GRADE_ORDER['A-']!).toBe(true)
  }, 60000)

  it('B on Lead Makeup Artist role (wrong field)', async () => {
    const r = await runMatch(LAWYER, LEAD_MAKEUP_ARTIST)
    assertStructure(r, 'Elena/Makeup')
    expect(r.grade).toBe('B')
  }, 60000)
})

describe('Hospitality Manager (Sofia Andersson)', () => {
  it('A or A- on Hotel GM role (right field)', async () => {
    const r = await runMatch(HOSPITALITY_MANAGER, HOTEL_GENERAL_MANAGER)
    assertStructure(r, 'Sofia/Hotel')
    expect(GRADE_ORDER[r.grade]! >= GRADE_ORDER['A-']!).toBe(true)
  }, 60000)

  it('B on Senior Backend Node.js (wrong field)', async () => {
    const r = await runMatch(HOSPITALITY_MANAGER, SENIOR_BACKEND_NODE)
    assertStructure(r, 'Sofia/Backend')
    expect(r.grade).toBe('B')
  }, 60000)
})

// ── Cross-field consistency: everyone gets B on wrong fields ──

describe('Cross-Field Mismatch Detection', () => {
  it('Makeup Artist gets B on Pilot role', async () => {
    const r = await runMatch(MAKEUP_ARTIST, COMMERCIAL_PILOT)
    assertStructure(r, 'Luna/Pilot')
    expect(r.grade).toBe('B')
  }, 60000)

  it('Pilot gets B on Frontend Web3 role', async () => {
    const r = await runMatch(PILOT, SENIOR_FRONTEND_WEB3)
    assertStructure(r, 'James/FE-Web3')
    expect(r.grade).toBe('B')
  }, 60000)

  it('Lawyer gets B on Hotel GM role', async () => {
    const r = await runMatch(LAWYER, HOTEL_GENERAL_MANAGER)
    assertStructure(r, 'Elena/Hotel')
    expect(r.grade).toBe('B')
  }, 60000)

  it('Hotel Manager gets B on Corporate Lawyer role', async () => {
    const r = await runMatch(HOSPITALITY_MANAGER, CORPORATE_LAWYER)
    assertStructure(r, 'Sofia/Lawyer')
    expect(r.grade).toBe('B')
  }, 60000)

  it('Developer gets B on Makeup Artist role', async () => {
    const r = await runMatch(PERFECT_MATCH, LEAD_MAKEUP_ARTIST)
    assertStructure(r, 'Alex/Makeup')
    expect(r.grade).toBe('B')
  }, 60000)
})
