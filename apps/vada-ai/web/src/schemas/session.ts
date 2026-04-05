import { z } from 'zod'

export const SessionState = z.enum([
  'PENDING',
  'ROUND_1',
  'ROUND_2',
  'ROUND_3',
  'CONCLUDING',
  'AUDITING',
  'REVISING',
  'TERMINAL'
])
export type SessionState = z.infer<typeof SessionState>

export const TerminalState = z.enum(['CLEAN', 'REVISED', 'UNCONVERGED'])
export type TerminalState = z.infer<typeof TerminalState>

export const InterventionType = z.enum(['WHISPER', 'DIRECTIVE', 'STOP'])
export type InterventionType = z.infer<typeof InterventionType>

export const DAILY_SESSION_LIMIT = 10
