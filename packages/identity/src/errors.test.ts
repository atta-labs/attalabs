import { describe, expect, it } from 'vitest'
import { classifyProviderError } from './errors'

describe('classifyProviderError', () => {
  it('classifies 401 as invalid_key', () => {
    const err = Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    const r = classifyProviderError(err, 'anthropic')
    expect(r.kind).toBe('invalid_key')
    expect(r.recoverable).toBe(false)
    expect(r.provider).toBe('anthropic')
  })

  it('classifies 403 as invalid_key', () => {
    const err = Object.assign(new Error('Forbidden'), { statusCode: 403 })
    expect(classifyProviderError(err, 'openai').kind).toBe('invalid_key')
  })

  it('classifies 429 with retry-after as rate_limit with recoverable true', () => {
    const err = Object.assign(new Error('Too many requests'), {
      statusCode: 429,
      responseHeaders: { 'retry-after': '30' }
    })
    const r = classifyProviderError(err, 'openai')
    expect(r.kind).toBe('rate_limit')
    expect(r.recoverable).toBe(true)
    expect(r.retryAfterSeconds).toBe(30)
  })

  it('classifies 429 without retry-after as rate_limit recoverable', () => {
    const err = Object.assign(new Error('Too many requests'), { statusCode: 429 })
    const r = classifyProviderError(err, 'groq')
    expect(r.kind).toBe('rate_limit')
    expect(r.recoverable).toBe(true)
    expect(r.retryAfterSeconds).toBeUndefined()
  })

  it('classifies 404 as model_not_found', () => {
    const err = Object.assign(new Error('not found'), { statusCode: 404 })
    expect(classifyProviderError(err, 'groq').kind).toBe('model_not_found')
  })

  it('classifies network TypeError as transient', () => {
    const err = new TypeError('Failed to fetch')
    expect(classifyProviderError(err, 'google').kind).toBe('transient')
  })

  it('classifies unknown errors as unknown', () => {
    expect(classifyProviderError(new Error('weird'), 'anthropic').kind).toBe('unknown')
  })

  it('non-Error input falls through to unknown', () => {
    expect(classifyProviderError('weird string', 'anthropic').kind).toBe('unknown')
  })
})
