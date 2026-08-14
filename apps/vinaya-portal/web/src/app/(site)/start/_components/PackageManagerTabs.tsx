'use client'

import { CodeBlock, Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const
export type PackageManager = (typeof PACKAGE_MANAGERS)[number]

export type PackageManagerTabsProps = {
  commands: Record<PackageManager, string>
}

// `forceMount` + a `data-[state=inactive]:hidden` panel class (rather than
// Radix's default unmount-on-inactive) so every manager's command is present
// in the server-rendered HTML, not only the one a client mounts after
// hydration — a reader who never runs JS (or a search crawler) still sees
// all four forms, and only CSS, not React, decides which one shows.
export function PackageManagerTabs({ commands }: PackageManagerTabsProps) {
  return (
    <Tabs defaultValue='npm'>
      <TabsList>
        {PACKAGE_MANAGERS.map((manager) => (
          <TabsTrigger key={manager} value={manager}>
            {manager}
          </TabsTrigger>
        ))}
      </TabsList>
      {PACKAGE_MANAGERS.map((manager) => (
        <TabsContent key={manager} value={manager} forceMount className='data-[state=inactive]:hidden'>
          <CodeBlock className='my-0'>
            <span className='text-muted-foreground'>$ </span>
            {commands[manager]}
          </CodeBlock>
        </TabsContent>
      ))}
    </Tabs>
  )
}
