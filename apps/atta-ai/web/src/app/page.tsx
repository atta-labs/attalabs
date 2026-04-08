import { Heading, Separator, Text } from '@atta/ui'
import { AIACanvas, AIASphere } from '@atta/ui/canvas'

export default function Home() {
  return (
    <main className='flex min-h-dvh items-center justify-center text-center'>
      <div className='relative flex h-full w-full items-center justify-center'>
        <AIACanvas
          particleCount={200}
          className='absolute inset-0 flex items-center justify-center pointer-events-none'
        >
          <AIASphere size='xl' state='idle' />
        </AIACanvas>
        <div className='relative z-10 flex flex-col items-center gap-10'>
          <Text as='small' className='uppercase tracking-widest'>
            atta.ai
          </Text>

          <div className='flex flex-col items-center gap-2'>
            <Heading level={1} className='text-7xl'>
              Attā
            </Heading>
            <Text as='p' className='text-lg'>
              attā · from the Pāli, self
            </Text>
          </div>

          <Separator className='w-10' />

          <Text as='p' className='text-3xl'>
            Awareness.
          </Text>
        </div>
      </div>
    </main>
  )
}
