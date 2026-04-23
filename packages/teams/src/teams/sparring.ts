import type { Team } from '@atta/engine'
import { strategist } from '../agents/strategist.js'
import { critic } from '../agents/critic.js'
import { conclusionSynthesizer } from '../agents/conclusion-synthesizer.js'
import { blindCritic } from '../agents/blind-critic.js'
import { factChecker } from '../agents/fact-checker.js'
import { roundMessageTemplate } from '../templates/round-template.js'
import { auditMessageTemplate } from '../templates/audit-template.js'

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
