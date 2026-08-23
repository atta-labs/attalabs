'use client'

import { CodeBlock, Tabs, TabsContent, TabsList, TabsTrigger } from '@atta/ui/components'

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const
export type PackageManager = (typeof PACKAGE_MANAGERS)[number]

export type PackageManagerTabsProps = {
  commands: Record<PackageManager, string>
}

// `keepMounted` + a `data-[hidden]:hidden` panel class (rather than Base
// UI's default unmount-when-inactive) so every manager's command is present
// in the server-rendered HTML, not only the one a client mounts after
// hydration — a reader who never runs JS (or a search crawler) still sees
// all four forms, and only CSS, not React, decides which one shows. This
// library's Tabs wraps @base-ui/react, not Radix: Base UI names the prop
// `keepMounted` (not Radix's `forceMount`) and marks a hidden panel with a
// `data-hidden` presence attribute (not Radix's `data-state="inactive"`).
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
        <TabsContent key={manager} value={manager} keepMounted className='data-[hidden]:hidden'>
          <CodeBlock className='my-0'>
            <span className='text-muted-foreground'>$ </span>
            {commands[manager]}
          </CodeBlock>
        </TabsContent>
      ))}
    </Tabs>
  )
}
