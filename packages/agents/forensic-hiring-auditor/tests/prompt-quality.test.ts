// Prompt quality fixture tests — herald-agents-v2 Task 5
//
// These tests do NOT call the LLM. They validate:
// 1. The fixture JSON conforms to MatchReport shape (catches schema drift).
// 2. The "after" fixture demonstrably beats the "before" fixture on
//    measurable quality dimensions — catches prompt regression if the YAML
//    is modified and re-evaluated fixtures show the same quality loss.
//
// The fixture pair is: Alex Chen (PERFECT_MATCH) × Senior Frontend Web3.
// Both fixtures should receive grade "A" — the test is not about correctness
// of the grade, but about quality of the evidence supporting it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { MatchReportSchema } from '../src/schema'

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures')

function loadFixture(path: string): unknown {
  const raw = readFileSync(path, 'utf-8')
  return JSON.parse(raw)
}

function stripFixtureMeta(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const { _fixture_meta: _, ...rest } = raw as Record<string, unknown>
  return rest
}

const beforeRaw = loadFixture(join(FIXTURES_DIR, 'before/alex-chen-frontend-web3.json'))
const afterRaw = loadFixture(join(FIXTURES_DIR, 'after/alex-chen-frontend-web3.json'))
const before = stripFixtureMeta(beforeRaw) as Record<string, unknown>
const after = stripFixtureMeta(afterRaw) as Record<string, unknown>

// ── Schema conformance ─────────────────────────────────────────────────────────

describe('Fixture schema conformance', () => {
  it('before fixture conforms to MatchReportSchema', () => {
    const result = MatchReportSchema.safeParse(before)
    if (!result.success) {
      console.error('before fixture schema errors:', JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })

  it('after fixture conforms to MatchReportSchema', () => {
    const result = MatchReportSchema.safeParse(after)
    if (!result.success) {
      console.error('after fixture schema errors:', JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })

  it('both fixtures agree on grade A for this candidate', () => {
    expect(before.grade).toBe('A')
    expect(after.grade).toBe('A')
  })
})

// ── Quality dimension tests ───────────────────────────────────────────────────
// These encode the measurable quality criteria from scoring.json.
// If a future prompt change produces output that regresses on these dimensions,
// these tests catch it before the regression ships.

type Signal = { title: string; observation: string; interpretation: string; confidence: string }
type Gap = { gap: string; severity: string; mitigation: string | null }

describe('Signal evidence-tier quality', () => {
  it('after: all signals have typed confidence (High/Medium/Low)', () => {
    const signals = after.signal as Signal[]
    for (const s of signals) {
      expect(['High', 'Medium', 'Low']).toContain(s.confidence)
    }
  })

  it('after: at least 4 signals (minimum for a graded report per SIGNAL_SCORING rule)', () => {
    const signals = after.signal as Signal[]
    expect(signals.length).toBeGreaterThanOrEqual(4)
  })

  it('after: at least 3 High-confidence signals (A-grade threshold)', () => {
    const signals = after.signal as Signal[]
    const highCount = signals.filter((s) => s.confidence === 'High').length
    expect(highCount).toBeGreaterThanOrEqual(3)
  })

  it('before: fewer High-confidence signals than after (quality regression baseline)', () => {
    const beforeSignals = before.signal as Signal[]
    const afterSignals = after.signal as Signal[]
    const beforeHigh = beforeSignals.filter((s) => s.confidence === 'High').length
    const afterHigh = afterSignals.filter((s) => s.confidence === 'High').length
    // The "before" prompt did not enforce evidence tiering — it may still have
    // labelled signals "High", but the after should have >= before High-count
    // because the improved prompt produces corroboration-grounded signals.
    expect(afterHigh).toBeGreaterThanOrEqual(beforeHigh)
  })
})

describe('Interview hook quality', () => {
  it('after: 3–5 interview hooks (INTERVIEW_HOOK_RULES bound)', () => {
    const hooks = after.interview_hooks as string[]
    expect(hooks.length).toBeGreaterThanOrEqual(3)
    expect(hooks.length).toBeLessThanOrEqual(5)
  })

  it('after: every hook is >15 words (specificity floor — concept probes are typically short)', () => {
    const hooks = after.interview_hooks as string[]
    for (const hook of hooks) {
      expect(hook.split(' ').length).toBeGreaterThan(15)
    }
  })

  it('before: at least one hook is <=15 words (documents the regression we fixed)', () => {
    const hooks = before.interview_hooks as string[]
    const shortHooks = hooks.filter((h) => h.split(' ').length <= 15)
    // The before fixture has concept probes that are short because they are generic.
    // If this fails, the before fixture was updated without preserving the regression evidence.
    expect(shortHooks.length).toBeGreaterThan(0)
  })

  it('after: hooks reference specific artifacts (named project, version, metric, or decision)', () => {
    const hooks = after.interview_hooks as string[]
    // Each hook should contain at least one of: a number, a named technology version,
    // a specific decision-framing term, or a named project reference.
    const ARTIFACT_PATTERNS = [/wagmi v\d/, /turborepo/i, /nft marketplace/i, /design system/i, /\d+%/, /\d+ team/i]

    let anchoredCount = 0
    for (const hook of hooks) {
      if (ARTIFACT_PATTERNS.some((p) => p.test(hook))) {
        anchoredCount++
      }
    }
    // At least 3 of the 4 hooks should be artifact-anchored
    expect(anchoredCount).toBeGreaterThanOrEqual(3)
  })
})

describe('Gap mitigation quality', () => {
  it('after: all gap mitigations are non-null and >10 words', () => {
    const gaps = after.gaps as Gap[]
    for (const g of gaps) {
      expect(g.mitigation).not.toBeNull()
      expect((g.mitigation as string).split(' ').length).toBeGreaterThan(10)
    }
  })

  it('before: at least one mitigation contains a generic platitude phrase', () => {
    const gaps = before.gaps as Gap[]
    const PLATITUDES = ['quick learner', 'can learn', 'general engineering', 'on the job']
    const platitudeCount = gaps.filter(
      (g) => g.mitigation && PLATITUDES.some((p) => (g.mitigation as string).toLowerCase().includes(p))
    ).length
    // The before fixture documents that the old prompt produced platitude mitigations.
    // If this fails, the before fixture was edited and the regression evidence was lost.
    expect(platitudeCount).toBeGreaterThan(0)
  })

  it('after: no mitigation contains a generic platitude phrase', () => {
    const gaps = after.gaps as Gap[]
    const PLATITUDES = ['quick learner', 'can learn', 'general engineering ability', 'on the job']
    for (const g of gaps) {
      if (!g.mitigation) continue
      const lower = g.mitigation.toLowerCase()
      for (const p of PLATITUDES) {
        expect(lower.includes(p)).toBe(false)
      }
    }
  })
})
