import { describe, expect, it } from 'vitest'
import { aggregateTaskTokenRows, parseTokenReportEntries, parseTokensLines } from './parse-token-report'

// Real PR body text, captured verbatim from this repo's own merged PRs
// during 4b's research (#445) — the bold-inline heading form.
const PR_454_BODY = `**Token report**

| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |
|---|---|---|---|---|---|---|
| 4: develop | Developer | claude-sonnet-5 (Claude Code) | — | — | — | 2026-07-07 |

Exact token/cost figures are unavailable in this session (no \`/cost\`-equivalent tool call surfaced to this agent in this environment) — reported as \`—\` rather than estimated.`

// Real PR body text — the \`## Token report\` heading-level form.
const PR_412_BODY = `## Token report

| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |
|---|---|---|---|---|---|---|
| 30: develop | Developer | Sonnet (Claude Code, dispatched) | — | — | — | 2026-07-05 |

Tokens: exact figures unavailable in this dispatched session (no \`/cost\` access from the automation surface) — stated rather than guessed.`

// Real PR body text — the inline field-list drift (\`### Token report\`).
const PR_374_BODY = `### Token report

Phase: 23: develop | Role: Developer | Agent/Model: Sonnet 5 (Claude Code CLI) | Tokens in: — | Tokens out: — | Cost: — | Date: 2026-07-04

Tokens unavailable — this execution environment does not expose a \`/cost\`-equivalent readout to this session (stated rather than fabricated).`

describe('parseTokenReportEntries: real PR body shapes', () => {
  it('parses the bold-inline `**Token report**` table form (PR #454)', () => {
    const rows = parseTokenReportEntries(PR_454_BODY)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      phase: '4: develop',
      role: 'Developer',
      agentModel: 'claude-sonnet-5 (Claude Code)',
      tokensIn: null,
      tokensOut: null,
      cost: null,
      date: '2026-07-07'
    })
  })

  it('parses the `## Token report` heading-level table form (PR #412)', () => {
    const rows = parseTokenReportEntries(PR_412_BODY)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ phase: '30: develop', role: 'Developer', date: '2026-07-05' })
  })

  it('parses the inline field-list drift form (PR #374)', () => {
    const rows = parseTokenReportEntries(PR_374_BODY)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      phase: '23: develop',
      role: 'Developer',
      agentModel: 'Sonnet 5 (Claude Code CLI)',
      tokensIn: null,
      tokensOut: null,
      cost: null,
      date: '2026-07-04'
    })
  })

  it('returns [] for a body with no Token report section', () => {
    expect(parseTokenReportEntries('## Summary\n\nJust a regular PR body.')).toEqual([])
  })
})

describe('parseTokenReportEntries: re-push (multiple entries in one body)', () => {
  const REPUSHED_BODY = `## Token report

| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |
|---|---|---|---|---|---|---|
| 12: develop | Developer | claude-opus-4-7 (CC) | 100000 | 8000 | $1.5000 | 2026-07-01 |

Some CHANGES_REQUESTED fixes applied.

## Token report

| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |
|---|---|---|---|---|---|---|
| 12: develop | Developer | claude-opus-4-7 (CC) | 20000 | 1500 | $0.3000 | 2026-07-02 |
`

  it('parses BOTH entries — never just the first or last match', () => {
    const rows = parseTokenReportEntries(REPUSHED_BODY)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ tokensIn: 100000, tokensOut: 8000, cost: 1.5, date: '2026-07-01' })
    expect(rows[1]).toMatchObject({ tokensIn: 20000, tokensOut: 1500, cost: 0.3, date: '2026-07-02' })
  })
})

describe('parseTokensLines: Reviewer/Security/Planner one-line report', () => {
  it('parses a Reviewer verdict-comment Tokens line with real figures', () => {
    const comment = 'Verdict: APPROVE\n\nTokens: 12: review — Reviewer — claude-opus-4-7 (chat) — 45000/3200/$0.82'
    const rows = parseTokensLines(comment)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      phase: '12: review',
      role: 'Reviewer',
      agentModel: 'claude-opus-4-7 (chat)',
      tokensIn: 45000,
      tokensOut: 3200,
      cost: 0.82
    })
  })

  it('parses a Security verdict-comment Tokens line with unknown (—) figures', () => {
    const comment = 'Security: PASS\n\nTokens: 12: security — Security — claude-opus-4-7 (chat) — —'
    const rows = parseTokensLines(comment)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      phase: '12: security',
      role: 'Security',
      tokensIn: null,
      tokensOut: null,
      cost: null
    })
  })

  it('parses a Planner report line (no task-id prefix — iteration-wide "planning" phase)', () => {
    const rows = parseTokensLines('Tokens: planning — Planner — claude-opus-4-7 (chat) — 184327/12502/$3.4781')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ phase: 'planning', role: 'Planner', tokensIn: 184327, tokensOut: 12502 })
  })

  it('does not split an agent/model name’s own internal hyphens as a segment separator', () => {
    const rows = parseTokensLines('Tokens: 5: review — Reviewer — claude-sonnet-5 — —')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.agentModel).toBe('claude-sonnet-5')
  })

  it('reports again on re-review — both lines parsed, not just one', () => {
    const text = [
      'Tokens: 8: review — Reviewer — claude-opus-4-7 (chat) — 10000/500/$0.10',
      'Tokens: 8: review — Reviewer — claude-opus-4-7 (chat) — 4000/300/$0.05'
    ].join('\n')
    expect(parseTokensLines(text)).toHaveLength(2)
  })

  it('skips a line that does not split into the 4 documented segments', () => {
    expect(parseTokensLines('**Tokens:** unavailable in this session surface (no /cost equivalent).')).toEqual([])
  })

  it('returns [] for text with no Tokens: line', () => {
    expect(parseTokensLines('Just a normal comment body.')).toEqual([])
  })
})

describe('aggregateTaskTokenRows', () => {
  it('combines Token report entries and Tokens: lines across body + comments of every PR given', () => {
    const rows = aggregateTaskTokenRows([
      {
        number: 454,
        body: PR_454_BODY,
        comments: ['Verdict: APPROVE\n\nTokens: 4: review — Reviewer — claude-opus-4-7 (chat) — —']
      },
      {
        number: 999,
        body: 'Tokens: planning — Planner — claude-opus-4-7 (chat) — 1000/200/$0.02',
        comments: []
      }
    ])
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.role)).toEqual(['Developer', 'Reviewer', 'Planner'])
  })

  it('returns [] when no PR carries any recognizable report — never a fabricated row', () => {
    expect(aggregateTaskTokenRows([{ number: 1, body: 'no reports here', comments: ['nothing here either'] }])).toEqual(
      []
    )
  })
})
