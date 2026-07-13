import { Text } from '@atta/ui/shared'

export function LandingFooter() {
  return (
    <footer className='flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-center sm:flex-row sm:text-left'>
      <Text as='span' size='xs' className='font-mono text-muted-foreground'>
        vinaya &middot; discipline for the AI era
      </Text>
      <Text as='span' size='xs' className='font-mono text-muted-foreground'>
        vinaya.attalabs.dev
      </Text>
    </footer>
  )
}
