import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { START_NAV } from '../_components/start-nav'
import { STAGES } from './stages'

// `server-only` throws unconditionally on plain import — Next's bundler
// aliases it away in real server builds; under vitest (no such bundler) it
// must be stubbed to import `github-links.ts`, same as the harness tests do.
vi.mock('server-only', () => ({}))
const { findAegRoot } = await import('@/lib/github-links')

const CONTRACTS_DIR = join(findAegRoot(), 'contracts')

/** The contract files carry only flat `key: value` frontmatter (no nested
 * YAML) — a minimal line parser avoids adding a `gray-matter` dependency to
 * a package that has none today. */
function readFrontmatter(path: string): Record<string, string> {
  const source = readFileSync(path, 'utf-8')
  const match = source.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    throw new Error(`${path} has no frontmatter block`)
  }
  const fields: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const fieldMatch = line.match(/^([\w-]+):\s*(.*)$/)
    if (fieldMatch) {
      fields[fieldMatch[1]] = fieldMatch[2].trim()
    }
  }
  return fields
}

// `security-archivist.md` ships in the installed package's `aeg-root/contracts/`
// but is deliberately not modeled as a STAGES entry: STAGES is a single
// linear chain (each stage's producer feeds exactly the next stage's
// consumer), and Security is a parallel, not sequential, step — it reviews
// the same pull request Review does, not the output of one stage feeding the
// next. `security-archivist.md` records a second, parallel fan-in edge
// (Security → Archivist, alongside Review → Archivist) that a linear chain
// has no slot for. Modeling that fan-in on the `/start` pipeline page is a
// real product/content decision (a second arrow into Archive, a badge, a
// note) — out of scope for this repoint; flagged for the Principal rather
// than decided here.
//
// `architect-planner.md` (added in `@attalabs/vinaya` 0.19.0, the milestone
// layer) is excluded for the same class of reason, one altitude higher: it
// is a manually-invoked, above-the-tranche edge — Architect turns a goal
// into ordered tranche intents that Planner then consumes, but Planner still
// starts the per-tranche STAGES chain itself. Architect never cuts task
// Issues and isn't part of a single tranche's task lifecycle, which is what
// this linear chain depicts. Whether/how to show a milestone-planning stage
// above `/start`'s existing pipeline is a real product/content decision,
// not decided here.
const CONTRACTS_MODELED_ELSEWHERE = new Set(['security-archivist.md', 'architect-planner.md'])

describe('STAGES — matches the contract files on disk', () => {
  it('declares exactly the contract files that exist in aeg-root/contracts/, modulo CONTRACTS_MODELED_ELSEWHERE', () => {
    const onDisk = readdirSync(CONTRACTS_DIR)
      .filter((file) => file.endsWith('.md'))
      .filter((file) => !CONTRACTS_MODELED_ELSEWHERE.has(file))
      .sort()
    const declared = STAGES.map((stage) => stage.contractFile)
      .filter((file): file is string => file !== null)
      .sort()
    expect(declared).toEqual(onDisk)
  })

  it('every stage with a contract names itself as producer and the next stage as consumer — the loop closing at wrap-up back to plan', () => {
    const chain = STAGES.filter((stage) => stage.contractFile !== null)
    expect(chain.length).toBeGreaterThan(0)

    for (const [index, stage] of chain.entries()) {
      const next = chain[(index + 1) % chain.length]
      const contractFile = stage.contractFile
      if (!contractFile) {
        throw new Error(`Stage "${stage.id}" has no contractFile despite the filter above`)
      }
      const frontmatter = readFrontmatter(join(CONTRACTS_DIR, contractFile))
      expect(frontmatter.producer, `${contractFile} producer`).toBe(stage.role)
      expect(frontmatter.consumer, `${contractFile} consumer`).toBe(next.role)
    }
  })

  it('Security carries no contract — it runs alongside Review, not in the chain', () => {
    const security = STAGES.find((stage) => stage.id === 'security')
    expect(security?.contractFile).toBeNull()
  })

  it('matches the "Ship with Vinaya" nav order exactly — no stage added or dropped on either side', () => {
    const navSlugs = START_NAV.find((section) => section.label === 'Ship with Vinaya')?.items.map((item) => item.slug)
    const stageIds = STAGES.map((stage) => stage.id)
    expect(stageIds).toEqual(navSlugs)
  })
})
