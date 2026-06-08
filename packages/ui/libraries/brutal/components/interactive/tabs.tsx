'use client'

import type * as React from 'react'
import { Tabs, TabsContent, TabsList as InstalledTabsList, TabsTrigger } from '../../installed/tabs'
import { cn } from '../../../../lib/utils'

function TabsList({ className, ...props }: React.ComponentProps<typeof InstalledTabsList>) {
  return <InstalledTabsList className={cn('gap-2 p-1.5', className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
