import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_GROUPS,
  type CapabilityStatus,
  FRAMEWORKS,
  INCLUSION_THRESHOLD_STARS,
  REVIEW_DATE
} from './comparison-data'

const VALID_STATUSES: ReadonlySet<CapabilityStatus> = new Set(['native', 'extension', 'not-in-core', 'not-verified'])
const ALL_KEYS = CAPABILITY_GROUPS.flatMap((group) => group.rows.map((row) => row.key))
const SOURCE = readFileSync(fileURLToPath(new URL('./comparison-data.ts', import.meta.url)), 'utf-8')

describe('comparison-data', () => {
  it('exactly the four competitors plus Vinaya appear, nothing else', () => {
    expect(FRAMEWORKS.map((fw) => fw.name)).toEqual(['Superpowers', 'Spec Kit', 'OpenSpec', 'BMAD', 'Vinaya'])
  })

  it('every framework has a value for every capability row — no gaps', () => {
    for (const fw of FRAMEWORKS) {
      for (const key of ALL_KEYS) {
        expect(fw.capabilities[key], `${fw.name} is missing "${key}"`).toBeDefined()
      }
    }
  })

  it('every claim carries an evidenceUrl or is explicitly not-verified', () => {
    for (const fw of FRAMEWORKS) {
      for (const key of ALL_KEYS) {
        const entry = fw.capabilities[key]
        const hasEvidence = typeof entry.evidenceUrl === 'string' && entry.evidenceUrl.length > 0
        expect(
          hasEvidence || entry.status === 'not-verified',
          `${fw.name}."${key}" (${entry.status}) has neither an evidenceUrl nor a not-verified status`
        ).toBe(true)
      }
    }
  })

  it('every status value is one of the four honest states', () => {
    for (const fw of FRAMEWORKS) {
      for (const key of ALL_KEYS) {
        expect(VALID_STATUSES.has(fw.capabilities[key].status)).toBe(true)
      }
    }
  })

  it('no coro or kiro identifier exists anywhere in the data file', () => {
    expect(SOURCE.toLowerCase()).not.toMatch(/\bcoro\b/)
    expect(SOURCE.toLowerCase()).not.toMatch(/\bkiro\b/)
  })

  it('the inclusion threshold and review date are exported constants, not hand-typed twice', () => {
    expect(INCLUSION_THRESHOLD_STARS).toBe(25_000)
    expect(REVIEW_DATE).toBe('2026-08-30')
    for (const fw of FRAMEWORKS) {
      expect(fw.reviewDate).toBe(REVIEW_DATE)
    }
  })

  it('every star count is a rounded floor to the nearest 10,000, never a raw live count', () => {
    for (const fw of FRAMEWORKS) {
      expect(fw.stars % 10_000, `${fw.name}'s star count ${fw.stars} isn't rounded to the nearest 10,000`).toBe(0)
    }
  })
})
