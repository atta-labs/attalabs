import { describe, expect, it } from 'vitest'
import { isNewDiskStateFile } from './no-disk-state'

describe('isNewDiskStateFile', () => {
  it('flags a new active (top-level) iteration topology file', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/fake-v1.md', 'added')).toBe(true)
  })

  it('flags a MODIFIED active (top-level) iteration topology file too', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/aeg-drift-prevention-v1.md', 'modified')).toBe(true)
  })

  it('does not flag README.md, added or modified', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/README.md', 'added')).toBe(false)
    expect(isNewDiskStateFile('aeg-root/iterations/README.md', 'modified')).toBe(false)
  })

  it('does not flag an EXISTING completed/ archive file being edited', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/completed/aeg-ui-v1.md', 'modified')).toBe(false)
  })

  it('flags a BRAND NEW .md file smuggled directly into completed/ (review finding)', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/completed/fake-v1.md', 'added')).toBe(true)
  })

  it('flags a new .tokens.md file under completed/', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/completed/fake-v1.tokens.md', 'added')).toBe(true)
  })

  it('does not flag an EXISTING completed/ .tokens.md ledger being edited', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/completed/aeg-ui-v1.tokens.md', 'modified')).toBe(false)
  })

  it('flags a new .tokens.md file anywhere in the repo', () => {
    expect(isNewDiskStateFile('apps/vinaya/specs/fake-v1.tokens.md', 'added')).toBe(true)
  })

  it('does not flag an existing .tokens.md file elsewhere being edited', () => {
    expect(isNewDiskStateFile('apps/vinaya/specs/fake-v1.tokens.md', 'modified')).toBe(false)
  })

  it('does not flag an unrelated file', () => {
    expect(isNewDiskStateFile('packages/aeg-core/bin/open-pr.ts', 'added')).toBe(false)
  })
})
