'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@atta/ui/components/tabs'
import type { Flow } from '@atta/engine'
import type { Plan } from '@atta/engine'
import { AgentTab } from './AgentTab'
import { CalculatorStats } from './CalculatorStats'
import { FlowTab } from './FlowTab'

interface TeamDetailTabsProps {
  spec: Flow
  plan: Plan
}

export function TeamDetailTabs({ spec, plan }: TeamDetailTabsProps) {
  return (
    <Tabs defaultValue='agents' className='space-y-6'>
      <TabsList>
        <TabsTrigger value='agents'>Agents</TabsTrigger>
        <TabsTrigger value='calculator'>Calculator</TabsTrigger>
        <TabsTrigger value='flow'>Flow</TabsTrigger>
      </TabsList>

      <TabsContent value='agents'>
        <AgentTab spec={spec} />
      </TabsContent>

      <TabsContent value='calculator'>
        <CalculatorStats spec={spec} />
      </TabsContent>

      <TabsContent value='flow'>
        <FlowTab plan={plan} />
      </TabsContent>
    </Tabs>
  )
}
