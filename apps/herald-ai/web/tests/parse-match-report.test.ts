// Regression guards for the JSON match-report parser.
//
// Production logs from June 2026 showed the Skeptical Auditor emitting
// 3.5k–4k output tokens for a complete report. The prior 2000-token cap (and
// the adapter's hidden 4096 cap) silently truncated the JSON mid-object;
// parseMatchReport returned null both times, and the route fell into its
// "took longer than expected" partial fallback. The fix (PR #129) raised the
// YAML cap to 8000 AND wired flow.defaults.max_tokens through to the
// Anthropic call. This file is the parser-side regression guard: even a
// 4000-token full-length report MUST parse, and a partial truncated report
// MUST cleanly return null so the route still falls back gracefully.

import { describe, expect, it } from 'bun:test'
import { parseMatchReport, type CandidateInfo } from '@/lib/parse-match-report'

const CANDIDATE: CandidateInfo = { name: 'Pepito', title: 'Engineer', github: 'pepito' }

function buildFullReport(extraInterviewHooks = 12): Record<string, unknown> {
  return {
    grade: 'A-',
    recommendation: 'Good Fit',
    confidence: 'High',
    confidence_reasoning: [
      'Hard requirements all met with verifiable evidence from profile and GitHub.',
      'Stack overlap is substantial across TypeScript, React, and Node services.',
      'Project ownership signals (CHANGELOG, releases, monorepo config) demonstrate end-to-end delivery experience.',
      'The only soft gap is depth in one preferred area, mitigated by adjacent shipped work.'
    ],
    hard_requirements: [
      {
        requirement: '5+ years of backend experience',
        kind: 'hard',
        met: true,
        evidence: 'Profile shows 7 yrs across two senior roles.'
      },
      { requirement: 'EU work authorization', kind: 'hard', met: true, evidence: 'Profile location is Madrid.' },
      {
        requirement: 'TypeScript proficiency',
        kind: 'hard',
        met: true,
        evidence: 'Three TS-first repos with shipped releases.'
      }
    ],
    signal: Array.from({ length: 8 }, (_, i) => ({
      title: `Signal ${i + 1}: Production-grade ${['TypeScript', 'React', 'Node', 'Postgres', 'Drizzle', 'Turborepo', 'CI/CD', 'Anthropic SDK'][i]} usage`,
      observation: `Detected repeated usage of ${i + 1} relevant technologies across recent repositories with shipped releases tagged in the last 12 months. The candidate's commit attribution shows authorship on ${10 + i} merged pull requests touching these areas.`,
      interpretation:
        'This signal demonstrates real delivery experience rather than tutorial-level familiarity. The pattern of release tagging plus authored PRs on shared monorepo infrastructure is consistent with the seniority claimed in the profile.',
      confidence: 'high'
    })),
    gaps: [
      {
        gap: 'No public Kubernetes experience surfaced in repos',
        severity: 'minor',
        mitigation:
          'The candidate has shipped containerised services to Vercel and Cloudflare; the orchestration surface area is small enough that K8s onboarding from a non-zero base is realistic.'
      },
      {
        gap: 'Limited GraphQL signal',
        severity: 'minor',
        mitigation:
          'Profile mentions GraphQL on one project; depth is best probed in the technical interview rather than assumed missing.'
      }
    ],
    interview_hooks: Array.from(
      { length: extraInterviewHooks },
      (_, i) =>
        `Your repository ${i + 1} shows a deliberate choice between approach A and approach B — walk me through the tradeoffs you considered, what you'd do differently now, and how the decision aged in production over the following six months.`
    )
  }
}

describe('parseMatchReport — full-length report regression', () => {
  it('parses a ~4000-token full report end-to-end', () => {
    // 48 hooks pushes the JSON well past the prior 4096-token Anthropic cap so
    // this fixture lives in the same regime as the prod logs that surfaced the
    // bug. Sonnet's tokenizer is ~3.8 chars / token on JSON-heavy content, so
    // ≥16 000 chars maps to ≳ 4 200 output tokens.
    const json = JSON.stringify(buildFullReport(48))
    expect(json.length).toBeGreaterThan(16_000)

    const report = parseMatchReport(json, CANDIDATE)
    expect(report).not.toBeNull()
    expect(report?.grade).toBe('A-')
    expect(report?.recommendation).toBe('Good Fit')
    expect(report?.signal.length).toBe(8)
    expect(report?.interview_hooks.length).toBe(48)
    expect(report?.hard_requirements.length).toBe(3)
    expect(report?.candidate).toEqual({ name: 'Pepito', title: 'Engineer', github: 'pepito' })
  })

  it('strips ```json fences before parsing', () => {
    const fenced = `\`\`\`json\n${JSON.stringify(buildFullReport(2))}\n\`\`\``
    const report = parseMatchReport(fenced, CANDIDATE)
    expect(report).not.toBeNull()
    expect(report?.signal.length).toBe(8)
  })

  it('returns null when the JSON is truncated mid-object (the production-bug shape)', () => {
    // Simulate the exact failure mode: the model started emitting JSON but ran
    // out of token budget. parseMatchReport must return null so the route can
    // fall through to its partial fallback. (Pre-fix, this is what happened
    // on every audit; post-fix, this should never happen at runtime — but the
    // safety net stays in place.)
    const full = JSON.stringify(buildFullReport(48))
    const truncated = full.slice(0, full.length - 1500)
    expect(parseMatchReport(truncated, CANDIDATE)).toBeNull()
  })

  it('returns null when required fields are missing', () => {
    expect(parseMatchReport(JSON.stringify({ grade: 'A' }), CANDIDATE)).toBeNull()
    expect(parseMatchReport(JSON.stringify({ grade: 'A', recommendation: 'Good Fit' }), CANDIDATE)).toBeNull()
  })

  it('tolerates prose before and after the JSON object (model-emitted commentary)', () => {
    // The Skeptical Auditor system prompt forbids prose outside the JSON, but
    // Sonnet occasionally emits a leading "Here is the report:" or trailing
    // commentary anyway. Pre-fix, JSON.parse threw and parseMatchReport
    // returned null; post-fix the parser slices the first balanced {...}
    // object and parses that, so the audit doesn't fall into the partial
    // fallback for a recoverable formatting drift.
    const json = JSON.stringify(buildFullReport(2))
    const wrapped = `Here is the forensic match audit:\n\n${json}\n\nLet me know if you need anything else.`
    const report = parseMatchReport(wrapped, CANDIDATE)
    expect(report).not.toBeNull()
    expect(report?.grade).toBe('A-')
    expect(report?.signal.length).toBe(8)
  })

  it('reports parse-failure diagnostics through onParseFailure callback', () => {
    // The route uses this callback to log a head/tail snippet of the model's
    // raw response when the parser rejects it, so future failures are
    // diagnosable without re-reading source.
    const diagnostics: Array<{ reason: string; head: string; tail: string }> = []
    const result = parseMatchReport('this is not json at all', CANDIDATE, {
      onParseFailure: (info) => diagnostics.push(info)
    })
    expect(result).toBeNull()
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]!.reason).toContain('no balanced JSON object')
    expect(diagnostics[0]!.head).toBe('this is not json at all')
  })

  it('enforces the NO FIT hard-requirement gate regardless of the model-reported grade', () => {
    const report = parseMatchReport(
      JSON.stringify({
        grade: 'A',
        recommendation: 'Hire',
        confidence: 'High',
        confidence_reasoning: ['Strong signals'],
        hard_requirements: [
          { requirement: '5+ years experience', kind: 'hard', met: false, evidence: 'Profile shows 2 years.' }
        ],
        signal: [],
        gaps: [],
        interview_hooks: []
      }),
      CANDIDATE
    )
    expect(report).not.toBeNull()
    expect(report?.grade).toBe('NO FIT')
    expect(report?.recommendation).toBe('No Fit')
    expect(report?.confidence).toBe('High')
  })
})
