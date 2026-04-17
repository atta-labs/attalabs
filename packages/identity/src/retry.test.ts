import { describe, expect, it, vi } from 'vitest'
import { retryWithBackoff } from './retry'

describe('retryWithBackoff', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retryWithBackoff(fn, { maxAttempts: 3 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries until success', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail1')).mockResolvedValueOnce('ok')
    const result = await retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws last error after maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(retryWithBackoff(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('respects shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1, shouldRetry: () => false })).rejects.toThrow(
      'fail'
    )
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
