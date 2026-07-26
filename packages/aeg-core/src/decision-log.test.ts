import { describe, expect, it } from 'vitest'
import { hasStatusBlock } from './decision-log'

describe('hasStatusBlock', () => {
  it('matches each accepted status value, bold or plain', () => {
    for (const status of ['draft', 'target', 'ratified', 'retired']) {
      expect(hasStatusBlock(`**Status:** ${status}`)).toBe(true)
      expect(hasStatusBlock(`Status: ${status}`)).toBe(true)
    }
  })

  it('rejects content with no Status field', () => {
    expect(hasStatusBlock('# A spec\n\nSome prose.')).toBe(false)
  })
})
