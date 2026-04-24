import { critic, devilsAdvocate, strategist } from '@vada/agents'

export const reviewerProfiles = {
  strategist,
  critic,
  devils_advocate: devilsAdvocate
} as const

export type ReviewerProfileName = keyof typeof reviewerProfiles
