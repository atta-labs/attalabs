import { Mastra } from '@mastra/core'
import { crucibleWorkflow } from '@/engine/workflow/crucible-workflow'

export const mastra = new Mastra({
  workflows: {
    crucible: crucibleWorkflow
  }
})
