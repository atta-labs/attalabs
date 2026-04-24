import type { Team } from '@atta/engine'
import {
  strategist,
  critic,
  devilsAdvocate,
  synthesizer,
  researcher,
  operator,
  conclusionSynthesizer,
  blindCritic,
  factChecker
} from '@vada/agents'
import { roundMessageTemplate } from '../templates/round-template'
import { auditMessageTemplate } from '../templates/audit-template'

// War Room = Crucible's core four + Researcher + Operator.
// Researcher grounds every argument in evidence; Operator stress-tests execution feasibility.
// Same 3-round dual-audit structure as Crucible.
export const warRoom: Team = {
  name: 'WarRoom',
  description:
    'Six-agent deliberation — Crucible core plus Researcher (evidence) and Operator (execution feasibility) — with dual-auditor revision loop',
  agents: [strategist, critic, devilsAdvocate, synthesizer, researcher, operator, conclusionSynthesizer, blindCritic, factChecker],
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
