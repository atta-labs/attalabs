import type { Team } from '@atta/engine'
import { a1Solo } from '../agents/a1-solo.js'

export const a1: Team = {
  name: 'A1',
  description: 'Rich single-shot baseline with structured output and conditional branches',
  agents: [a1Solo],
  workflow: { type: 'solo' }
}
