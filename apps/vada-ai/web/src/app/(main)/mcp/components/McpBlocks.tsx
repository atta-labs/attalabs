import { Separator, TabsContent } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import { CopyButton } from './CopyButton'

// The MCP page's building blocks. Every block owns its own spacing, so the page reads the same
// everywhere: callers compose blocks and never add margins between them.

/** A run of blocks with the page's one vertical rhythm. */
function Stack({ children, gap = 'gap-4' }: { children: ReactNode; gap?: 'gap-1' | 'gap-2' | 'gap-4' | 'gap-6' }) {
  return <div className={`flex flex-col ${gap}`}>{children}</div>
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className='rounded bg-muted px-1 font-mono text-xs text-foreground'>{children}</code>
}

export function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <NextLink
      href={href}
      variant='unstyled'
      className='underline underline-offset-2 transition-colors hover:text-primary'
    >
      {children}
    </NextLink>
  )
}

/** Body copy at the page's one size. `lead` is the larger intro paragraph. */
export function Prose({ children, lead = false }: { children: ReactNode; lead?: boolean }) {
  return (
    <Text as='p' muted className={lead ? 'leading-relaxed' : 'text-sm leading-relaxed'}>
      {children}
    </Text>
  )
}

export function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  return (
    <div className='relative rounded-lg border border-border bg-muted/30'>
      <div className='absolute right-2 top-2'>
        <CopyButton text={code} />
      </div>
      <pre className='overflow-x-auto p-4 pr-20 font-mono text-xs text-foreground'>
        <code data-language={language}>{code}</code>
      </pre>
    </div>
  )
}

/** A page section: optional eyebrow, title, optional intro, then its content. */
export function McpSection({
  eyebrow,
  title,
  intro,
  children
}: {
  eyebrow?: string
  title: string
  intro?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className='flex flex-col gap-6'>
      <Stack gap='gap-2'>
        {eyebrow && <span className='font-mono text-xs text-muted-foreground'>{eyebrow}</span>}
        <Heading level={2} className='font-serif text-2xl font-light'>
          {title}
        </Heading>
        {intro && <Prose>{intro}</Prose>}
      </Stack>
      {children}
    </section>
  )
}

export function SectionDivider() {
  return <Separator className='opacity-20' />
}

/**
 * One tab's panel. Spacing lives on an inner stack, not on `TabsContent` itself: some libraries
 * wrap the panel's children in their own motion layer, where a `space-y-*` on the panel never
 * reaches them.
 */
export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsContent value={value} className='mt-6'>
      <Stack>{children}</Stack>
    </TabsContent>
  )
}

/** A numbered step: number, title, then its content indented under the title. */
export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Stack gap='gap-2'>
      <div className='flex items-center gap-2'>
        <span className='flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs text-muted-foreground'>
          {n}
        </span>
        <Text as='p' className='font-medium'>
          {title}
        </Text>
      </div>
      <div className='ml-8 flex flex-col gap-2'>{children}</div>
    </Stack>
  )
}

export function Steps({ children }: { children: ReactNode }) {
  return <Stack gap='gap-6'>{children}</Stack>
}

/** A bulleted list at the body size. */
export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className='flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground'>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/** A term with its explanation — used for tools, teams and troubleshooting entries. */
export function Entry({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <Stack gap='gap-1'>
      <div className='text-sm font-medium text-foreground'>{term}</div>
      <Prose>{children}</Prose>
    </Stack>
  )
}

export function Entries({ children }: { children: ReactNode }) {
  return <Stack>{children}</Stack>
}
