export type TeamId = 'crucible' | 'war_room' | 'sparring'

export const SPEC_ID_TO_TEAM_ID: Record<string, TeamId> = {
  crucible: 'crucible',
  'war-room': 'war_room',
  sparring: 'sparring'
}
