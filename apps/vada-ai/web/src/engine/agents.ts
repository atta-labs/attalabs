import { defineDeliberationAgent } from '@atta/orchestration'
import { composeSystemPrompt } from './prompts/compose'

export const strategistAgent = defineDeliberationAgent({
  role: 'strategist',
  name: 'Strategist',
  instructions: (ctx) => composeSystemPrompt('strategist', ctx.round, ctx.hasWhispers, ctx.question)
})

export const criticAgent = defineDeliberationAgent({
  role: 'critic',
  name: 'Critic',
  instructions: (ctx) => composeSystemPrompt('critic', ctx.round, ctx.hasWhispers, ctx.question)
})

export const devilsAdvocateAgent = defineDeliberationAgent({
  role: 'devils_advocate',
  name: "Devil's Advocate",
  instructions: (ctx) => composeSystemPrompt('devils_advocate', ctx.round, ctx.hasWhispers, ctx.question)
})

export const synthesizerAgent = defineDeliberationAgent({
  role: 'synthesizer',
  name: 'Synthesizer',
  instructions: (ctx) => composeSystemPrompt('synthesizer', ctx.round, ctx.hasWhispers, ctx.question)
})

export const researcherAgent = defineDeliberationAgent({
  role: 'researcher',
  name: 'Researcher',
  instructions: (ctx) => composeSystemPrompt('researcher', ctx.round, ctx.hasWhispers, ctx.question)
})

export const operatorAgent = defineDeliberationAgent({
  role: 'operator',
  name: 'Operator',
  instructions: (ctx) => composeSystemPrompt('operator', ctx.round, ctx.hasWhispers, ctx.question)
})
