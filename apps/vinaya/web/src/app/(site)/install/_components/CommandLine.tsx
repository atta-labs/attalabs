import { Text } from '@atta/ui/shared'

export function CommandLine({ command }: { command: string }) {
  return (
    <div className='flex items-baseline gap-2'>
      <Text as='span' className='font-mono' muted>
        $
      </Text>
      <Text as='span' weight='bold' className='font-mono'>
        {command}
      </Text>
    </div>
  )
}
