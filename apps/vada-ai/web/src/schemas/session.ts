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

export const TerminalState = z.enum(['CLEAN', 'REVISED', 'UNCONVERGED', 'SPARRING_COMPLETE'])
export type TerminalState = z.infer<typeof TerminalState>

export const InterventionType = z.enum(['WHISPER', 'DIRECTIVE', 'STOP'])
export type InterventionType = z.infer<typeof InterventionType>

// Default cap. Override per environment with VADA_DAILY_SESSION_LIMIT (server-
// only — the authoritative check lives in /deliberate page.tsx). Set to a
// large number in .env.local for dev iteration; keep prod restrictive.
const DEFAULT_DAILY_SESSION_LIMIT = 10

export function getDailySessionLimit(): number {
  const raw = process.env.VADA_DAILY_SESSION_LIMIT
  if (!raw) return DEFAULT_DAILY_SESSION_LIMIT
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_SESSION_LIMIT
}

// Re-exported as a constant only for the (few) non-server contexts that still
// reference it — prefer calling getDailySessionLimit() at the point of use so
// the env override is honored.
export const DAILY_SESSION_LIMIT = DEFAULT_DAILY_SESSION_LIMIT
