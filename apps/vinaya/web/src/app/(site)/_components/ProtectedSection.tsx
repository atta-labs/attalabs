import { Text } from '@atta/ui/shared'
import { ProtectedCanvas } from './canvas/ProtectedCanvas'

export function ProtectedSection() {
  return (
    <section className='flex flex-col gap-6'>
      <ProtectedCanvas />

      <Text as='p' size='xl' weight='bold' className='text-center font-mono text-foreground'>
        Nothing reaches main without passing the same deterministic checks.
        <br />
        Human or Agent.
      </Text>
      <Text as='p' weight='bold' size='lg' className='text-center font-mono'>
        <span className='text-success'>full speed &middot; zero damage</span>
        <span className='text-muted-foreground'> &mdash; main is protected</span>
      </Text>
    </section>
  )
}
