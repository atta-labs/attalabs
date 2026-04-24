import type { Team } from '@atta/engine'
import { strategist, critic, devilsAdvocate } from '@vada/agents'

const REVIEWER_TEMPLATE = '{{question}}'

export const brokeredTrio: Team = {
  name: 'BrokeredTrio',
  description: 'Three independent reviewer consultations (Strategist, Critic, Devil\'s Advocate) — no cross-reviewer context',
  agents: [strategist, critic, devilsAdvocate],
  workflow: {
    type: 'brokered',
    reviewers: [
      { agentName: 'Strategist', messageTemplate: REVIEWER_TEMPLATE },
      { agentName: 'Critic', messageTemplate: REVIEWER_TEMPLATE },
      { agentName: "Devil's Advocate", messageTemplate: REVIEWER_TEMPLATE }
    ]
  }
}
