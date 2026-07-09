import { describe, expect, it } from 'bun:test'
import { capStack } from './parse-cv'

describe('capStack', () => {
  it('caps an over-limit array to MAX_STACK_TAGS (20), preserving order', () => {
    const input = Array.from({ length: 25 }, (_, i) => `tag-${i}`)
    const result = capStack(input)

    expect(result).toHaveLength(20)
    expect(result).toEqual(input.slice(0, 20))
  })

  it('returns an under-limit array unchanged', () => {
    const input = ['React', 'TypeScript', 'LangGraph', 'Bun', 'Postgres']
    const result = capStack(input)

    expect(result).toEqual(input)
  })
})
