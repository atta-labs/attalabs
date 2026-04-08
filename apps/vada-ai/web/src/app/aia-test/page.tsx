'use client'

import { AIACanvas, AIARing, AIASphere } from '@atta/ui/canvas'

export default function AIATestPage() {
  return (
    <main className='min-h-dvh'>
      <AIACanvas particleCount={500} className='fixed inset-0 w-full h-full'>
        <div className='flex min-h-dvh items-center justify-center'>
          <AIARing
            size={500}
            orbit={[
              <AIASphere key='s1' size='md' state='speaking' showMatrix />,
              <AIASphere key='s2' size='md' state='speaking' showMatrix />,
              <AIASphere key='s3' size='md' state='speaking' showMatrix />,
              <AIASphere key='s4' size='md' state='speaking' showMatrix />,
              <AIASphere key='s5' size='md' state='speaking' showMatrix />,
              <AIASphere key='s6' size='md' state='speaking' showMatrix />
            ]}
          />
        </div>
      </AIACanvas>
    </main>
  )
}
