import type { Team } from '@atta/engine'
import { strategist, critic, devilsAdvocate, domainExpert } from '@vada/agents'

const REVIEWER_TEMPLATE = '{{question}}'

/**
 * Four-reviewer brokered consultation including Domain Expert.
 * Domain Expert's system prompt contains {{DOMAIN}} placeholder — parameterized
 * at dispatch time via createDomainExpert(). Flag-gated: VADA_DOMAIN_EXPERT=true.
 */
export const brokeredQuartet: Team = {
  name: 'BrokeredQuartet',
  description:
    "Four independent reviewer consultations (Strategist, Critic, Devil's Advocate, Domain Expert) — flag-gated",
  agents: [strategist, critic, devilsAdvocate, domainExpert],
  workflow: {
    type: 'brokered',
    reviewers: [
      { agentName: 'Strategist', messageTemplate: REVIEWER_TEMPLATE },
      { agentName: 'Critic', messageTemplate: REVIEWER_TEMPLATE },
      { agentName: "Devil's Advocate", messageTemplate: REVIEWER_TEMPLATE },
      { agentName: 'Domain Expert', messageTemplate: REVIEWER_TEMPLATE }
    ]
  }
}
