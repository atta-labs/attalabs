import type { Team } from '@atta/engine'
import { strategist } from '../agents/strategist'
import { critic } from '../agents/critic'
import { devilsAdvocate } from '../agents/devils-advocate'
import { synthesizer } from '../agents/synthesizer'
import { conclusionSynthesizer } from '../agents/conclusion-synthesizer'
import { blindCritic } from '../agents/blind-critic'
import { factChecker } from '../agents/fact-checker'
import { roundMessageTemplate } from '../templates/round-template'
import { auditMessageTemplate } from '../templates/audit-template'

// V1 Crucible ported to @atta/engine Team config.
// 4 agents × 3 rounds, then ConclusionSynthesizer produces structured verdict,
// then BlindCritic (logic audit) + FactChecker (factual accuracy) run sequentially.
// Either auditor flagging triggers a revision. maxRevisions: 1 matches V1's single revision cycle.
export const crucible: Team = {
  name: 'Crucible',
  description: 'Four-agent deliberation with dual-auditor (logic + fact) revision loop',
  agents: [strategist, critic, devilsAdvocate, synthesizer, conclusionSynthesizer, blindCritic, factChecker],
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
