import { CodeBlock } from '@atta/ui/components'

/** A single-command display, local to this section. */
export function CommandLine({ command }: { command: string }) {
  return (
    <CodeBlock className='my-0'>
      <span className='text-muted-foreground'>$ </span>
      {command}
    </CodeBlock>
  )
}
