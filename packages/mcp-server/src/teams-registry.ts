import { sparring, crucible } from '@atta/teams'

export const availableTeams = {
  sparring,
  crucible
} as const

export type TeamName = keyof typeof availableTeams

export function lookupTeam(name: string) {
  const team = availableTeams[name as TeamName]
  if (!team) {
    throw new Error(`Unknown team: ${name}. Available: ${Object.keys(availableTeams).join(', ')}`)
  }
  return team
}
