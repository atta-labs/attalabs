import { Text } from '@atta/ui/components'

interface StatusFooterProps {
  label: string
  body: string
}

export function StatusFooter({ label, body }: StatusFooterProps) {
  return (
    <div className='flex flex-col gap-2'>
      <Text as='small' className='font-mono uppercase tracking-widest text-xs text-muted-foreground'>
        Status: {label}
      </Text>
      <Text as='p' className='italic text-sm text-muted-foreground max-w-md'>
        {body}
      </Text>
    </div>
  )
}
