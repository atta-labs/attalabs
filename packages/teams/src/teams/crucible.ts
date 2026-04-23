import type { Team } from '@atta/engine'
import { strategist } from '../agents/strategist.js'
import { critic } from '../agents/critic.js'
import { devilsAdvocate } from '../agents/devils-advocate.js'
import { synthesizer } from '../agents/synthesizer.js'
import { conclusionSynthesizer } from '../agents/conclusion-synthesizer.js'
import { blindCritic } from '../agents/blind-critic.js'
import { roundMessageTemplate } from '../templates/round-template.js'
import { auditMessageTemplate } from '../templates/audit-template.js'

// V1 Crucible ported to @atta/engine Team config.
// 4 agents × 3 rounds, then ConclusionSynthesizer produces structured verdict,
// then BlindCritic audits. maxRevisions: 1 matches V1's single revision cycle.
export const crucible: Team = {
  name: 'Crucible',
  description: 'Four-agent deliberation with BlindCritic audit-triggered revision',
  agents: [strategist, critic, devilsAdvocate, synthesizer, conclusionSynthesizer, blindCritic],
  workflow: {
    type: 'rounds',
    rounds: 3,
    messageTemplate: roundMessageTemplate,
    terminalAgent: 'ConclusionSynthesizer',
    auditAgent: 'BlindCritic',
    auditTemplate: auditMessageTemplate,
    revisionCondition: {
      type: 'contains',
      value: 'FLAG',
      caseSensitive: false
    },
    maxRevisions: 1
  }
}
