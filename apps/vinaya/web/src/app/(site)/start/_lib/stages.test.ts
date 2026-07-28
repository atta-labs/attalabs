import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { START_NAV } from '../_components/start-nav'
import { STAGES } from './stages'

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..', '..', '..', '..', '..')
const CONTRACTS_DIR = join(REPO_ROOT, 'aeg-root', 'contracts')

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

describe('STAGES — matches the contract files on disk', () => {
  it('declares exactly the contract files that exist in aeg-root/contracts/', () => {
    const onDisk = readdirSync(CONTRACTS_DIR)
      .filter((file) => file.endsWith('.md'))
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
