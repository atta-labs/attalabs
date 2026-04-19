import { defineDeliberationAgent } from '@atta/orchestration'
import { composeSystemPrompt } from './prompts/compose'

export const strategistAgent = defineDeliberationAgent({
  role: 'strategist',
  name: 'Strategist',
  instructions: (ctx) => composeSystemPrompt('strategist', ctx.round, ctx.hasWhispers, ctx.question)
})
