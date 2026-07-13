import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import { type Action, ACTIONS, CROSSING_KEYWORDS } from './actions'
import { type GateRow, parseEnforcementRegistry } from './registry-parse'

const REPO_ROOT = join(import.meta.dirname, '../../..')
const ENFORCEMENT_PATH = join(REPO_ROOT, 'aeg-root/enforcement.md')
const ROLES_DIR = join(REPO_ROOT, 'aeg-root/roles')

describe('ACTIONS — shape', () => {
  it('has exactly 10 entries (6 crossings + 4 seam-only, not 12 — no duplicate id for a seam already covered by a crossing)', () => {
    expect(ACTIONS).toHaveLength(10)
  })

  it('every id is unique', () => {
    const ids = ACTIONS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every crosses is a valid ActionCrossing', () => {
    for (const a of ACTIONS) {
      expect(a.crosses === 'into-github' || a.crosses === 'none').toBe(true)
    }
  })

  it('every performedBy array is non-empty', () => {
    for (const a of ACTIONS) {
      expect(a.performedBy.length).toBeGreaterThan(0)
    }
  })

  it('commit-the-work crosses none — git commit is local, only git push reaches the forge (D-119)', () => {
    const commit = ACTIONS.find((a) => a.id === 'commit-the-work')
    expect(commit?.crosses).toBe('none')
  })

  it('every summary is non-empty', () => {
    for (const a of ACTIONS) {
      expect(a.summary.length).toBeGreaterThan(0)
    }
  })
})

describe('ACTIONS — real-file cross-check', () => {
  // CROSSING_KEYWORDS now lives in ./actions (exported), shared with
  // diagram-model.ts's guards edges so the map can never drift (D-119).
  const ring0Rows: GateRow[] = parseEnforcementRegistry(readFileSync(ENFORCEMENT_PATH, 'utf8')).filter(
    (r) => r.ring === 'ring0'
  )

  it('parses at least one Ring-0 row from the real enforcement.md', () => {
    expect(ring0Rows.length).toBeGreaterThan(0)
  })

  it('every into-github action has a keyword mapping', () => {
    for (const a of ACTIONS) {
      if (a.crosses !== 'into-github') continue
      expect(CROSSING_KEYWORDS[a.id]).toBeDefined()
    }
  })

  it('every into-github action maps to a real Ring-0 gate row', () => {
    for (const a of ACTIONS) {
      if (a.crosses !== 'into-github') continue
      const keyword = CROSSING_KEYWORDS[a.id]?.toLowerCase() ?? ''
      const backed = ring0Rows.some((r) => r.action.toLowerCase().includes(keyword))
      expect(backed, `into-github action '${a.id}' has no Ring-0 row containing '${keyword}'`).toBe(true)
    }
  })

  it('every performedBy role_id exists in aeg-root/roles/*.md frontmatter', () => {
    const roleIds = new Set<string>()
    for (const file of readdirSync(ROLES_DIR).filter((f) => f.endsWith('.md'))) {
      const { data } = matter(readFileSync(join(ROLES_DIR, file), 'utf8'))
      if (typeof data.role_id === 'string') roleIds.add(data.role_id)
    }
    expect(roleIds.size).toBe(9)

    const referenced = new Set<string>(ACTIONS.flatMap((a: Action) => a.performedBy))
    for (const roleId of referenced) {
      expect(roleIds.has(roleId), `performedBy '${roleId}' is not a real role_id`).toBe(true)
    }
  })
})
