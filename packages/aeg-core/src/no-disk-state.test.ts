import { describe, expect, it } from 'vitest'
import { isNewDiskStateFile } from './no-disk-state'

describe('isNewDiskStateFile', () => {
  it('flags a new active (top-level) tranche topology file', () => {
    expect(isNewDiskStateFile('aeg-root/tranches/fake-v1.md', 'added')).toBe(true)
  })

  it('flags a MODIFIED active (top-level) tranche topology file too', () => {
    expect(isNewDiskStateFile('aeg-root/tranches/aeg-drift-prevention-v1.md', 'modified')).toBe(true)
  })

  it('does not flag a model doc that sits outside aeg-root/tranches/', () => {
    // The tranche model moved out of the watched directory, so this passes
    // by path shape rather than by an explicit carve-out. Asserted with a
    // second model doc so it cannot quietly become a one-file special case.
    expect(isNewDiskStateFile('aeg-root/tranche-model.md', 'added')).toBe(false)
    expect(isNewDiskStateFile('aeg-root/tranche-model.md', 'modified')).toBe(false)
    expect(isNewDiskStateFile('aeg-root/state-machine.md', 'added')).toBe(false)
  })

  it('still flags a NEW README.md smuggled into aeg-root/tranches/', () => {
    // The old carve-out keyed on this exact filename; nothing may re-enter
    // the archive directory under a name that used to be exempt.
    expect(isNewDiskStateFile('aeg-root/tranches/README.md', 'added')).toBe(true)
  })

  it('does not flag an EXISTING completed/ archive file being edited', () => {
    expect(isNewDiskStateFile('aeg-root/tranches/completed/aeg-ui-v1.md', 'modified')).toBe(false)
  })

  it('flags a BRAND NEW .md file smuggled directly into completed/ (review finding)', () => {
    expect(isNewDiskStateFile('aeg-root/tranches/completed/fake-v1.md', 'added')).toBe(true)
  })

  it('flags a new .tokens.md file under completed/', () => {
    expect(isNewDiskStateFile('aeg-root/tranches/completed/fake-v1.tokens.md', 'added')).toBe(true)
  })

  it('does not flag an EXISTING completed/ .tokens.md ledger being edited', () => {
    expect(isNewDiskStateFile('aeg-root/tranches/completed/aeg-ui-v1.tokens.md', 'modified')).toBe(false)
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
