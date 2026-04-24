import type { Team } from '@atta/engine'
import { a0Solo } from '@vada/agents'

export const a0: Team = {
  name: 'A0',
  description: 'Naive single-shot baseline',
  agents: [a0Solo],
  workflow: { type: 'solo' }
}
