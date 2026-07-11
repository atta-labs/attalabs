import { describe, expect, it } from 'vitest'
import { isNewDiskStateFile } from './no-disk-state'

describe('isNewDiskStateFile', () => {
  it('flags a new active iteration topology file', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/fake-v1.md')).toBe(true)
  })

  it('does not flag README.md', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/README.md')).toBe(false)
  })

  it('does not flag an existing completed/ archive file (extra path segment)', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/completed/aeg-ui-v1.md')).toBe(false)
  })

  it('flags a new .tokens.md file under completed/', () => {
    expect(isNewDiskStateFile('aeg-root/iterations/completed/fake-v1.tokens.md')).toBe(true)
  })

  it('flags a new .tokens.md file anywhere in the repo', () => {
    expect(isNewDiskStateFile('apps/aeg/specs/fake-v1.tokens.md')).toBe(true)
  })

  it('does not flag an unrelated file', () => {
    expect(isNewDiskStateFile('packages/aeg-core/bin/open-pr.ts')).toBe(false)
  })
})
