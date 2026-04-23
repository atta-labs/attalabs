import type { Team } from '@atta/engine'
import { a0Solo } from '../agents/a0-solo.js'

export const a0: Team = {
  name: 'A0',
  description: 'Naive single-shot baseline',
  agents: [a0Solo],
  workflow: { type: 'solo' }
}
