'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'
import type { ReactNode } from 'react'

/**
 * Tab shell for the tranche board. The page stays a server component — both
 * panels are rendered there (live forge reads included) and passed in as
 * children, so only the tab state itself is client-side.
 */
export function TrancheTabs({ tasks, ledger }: { tasks: ReactNode; ledger: ReactNode }) {
  return (
    <Tabs defaultValue='tasks' className='space-y-4'>
      <TabsList>
        <TabsTrigger value='tasks'>Tasks</TabsTrigger>
        <TabsTrigger value='ledger'>Token Ledger</TabsTrigger>
      </TabsList>
      <TabsContent value='tasks' className='space-y-8'>
        {tasks}
      </TabsContent>
      <TabsContent value='ledger' className='space-y-3'>
        {ledger}
      </TabsContent>
    </Tabs>
  )
}
