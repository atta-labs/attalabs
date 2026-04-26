export type TeamId = 'crucible' | 'war_room' | 'sparring'

export const SPEC_ID_TO_TEAM_ID: Record<string, TeamId> = {
  'crucible-v1': 'crucible',
  'war-room-v1': 'war_room',
  'sparring-v1': 'sparring'
}
