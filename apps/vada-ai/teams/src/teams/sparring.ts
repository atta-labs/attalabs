import type { Team } from '@atta/engine'
import { strategist, critic, conclusionSynthesizer, blindCritic, factChecker } from '@vada/agents'
import { roundMessageTemplate } from '../templates/round-template'
import { auditMessageTemplate } from '../templates/audit-template'

export const sparring: Team = {
  name: 'Sparring',
  description: 'Two-agent deliberation with dual-auditor (logic + fact) revision loop',
  agents: [strategist, critic, conclusionSynthesizer, blindCritic, factChecker],
  workflow: {
    type: 'rounds',
    rounds: 3,
    messageTemplate: roundMessageTemplate,
    terminalAgent: 'ConclusionSynthesizer',
    auditAgent: ['BlindCritic', 'FactChecker'],
    auditTemplate: auditMessageTemplate,
    revisionCondition: {
      type: 'contains',
      value: 'FLAG',
      caseSensitive: false
    },
    maxRevisions: 1
  }
}
