import { describe, expect, it } from 'vitest'
import { checkDirectMainPush } from './direct-main-push'

describe('checkDirectMainPush', () => {
  it('legitimate — commit associated with a merged PR (normal squash-merge/merge-commit case)', () => {
    const result = checkDirectMainPush({ sha: 'abc123', associatedMergedPrNumbers: [375] })
    expect(result).toEqual({ verdict: 'legitimate', mergedPrNumber: 375 })
  })

  it('direct-push — commit has no associated merged PR at all', () => {
    const result = checkDirectMainPush({ sha: 'deadbeef', associatedMergedPrNumbers: [] })
    expect(result).toEqual({ verdict: 'direct-push', sha: 'deadbeef' })
  })

  it('legitimate — picks the first associated merged PR when more than one is reported', () => {
    const result = checkDirectMainPush({ sha: 'abc123', associatedMergedPrNumbers: [200, 201] })
    expect(result).toEqual({ verdict: 'legitimate', mergedPrNumber: 200 })
  })
})
