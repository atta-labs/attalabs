import { Text } from '@atta/ui/shared'

export function CommandBlock({ command }: { command: string }) {
  return (
    <pre className='overflow-x-auto rounded-md bg-muted p-4 font-mono text-sm text-foreground'>
      <Text as='span' className='font-mono' muted>
        ${' '}
      </Text>
      {command}
    </pre>
  )
}
