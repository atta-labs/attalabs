import { CodeBlock } from '@atta/ui/components'

// A single-command display, local to this page — `apps/vinaya/web/src/app/(site)/install/_components/CommandBlock.tsx`
// carries the identical shape, but that file belongs to a sibling task's
// surface (see §4), so this is a deliberate duplicate rather than a shared
// import across two route groups' local component directories.
export function CommandLine({ command }: { command: string }) {
  return (
    <CodeBlock className='my-0'>
      <span className='text-muted-foreground'>$ </span>
      {command}
    </CodeBlock>
  )
}
