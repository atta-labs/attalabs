import { CodeBlock } from '@atta/ui'

// `my-0` overrides `CodeBlock`'s own `my-4`: that margin is right for the docs
// markdown flow the component's treatment comes from, but here the entry's
// `flex flex-col gap-3` owns the vertical rhythm and the two would stack.
export function CommandBlock({ command }: { command: string }) {
  return (
    <CodeBlock className='my-0'>
      <span className='text-muted-foreground'>$ </span>
      {command}
    </CodeBlock>
  )
}
