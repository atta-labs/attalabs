import Link from 'next/link'
import { SplitChooserCanvas } from './components/home/SplitChooserCanvas'
import { BrokeredScene } from './components/home/BrokeredScene'
import { BrainCardConnector } from '../components/BrainCardConnector'

export default function BrokeredPage() {
  return (
    <>
      <SplitChooserCanvas>
        <BrokeredScene />
      </SplitChooserCanvas>

      {/* Full-height center divider */}
      <div className='fixed inset-y-0 left-1/2 w-px bg-border/40 z-10 pointer-events-none' />

      {/* Brain → cards connector */}
      <BrainCardConnector />

      {/* Mode cards — bottom, one per half */}
      <div className='fixed inset-0 z-10 pointer-events-none'>
        <div
          className='absolute pointer-events-auto'
          style={{ left: '40vw', top: '86vh', transform: 'translate(-50%, -50%)' }}
        >
          <Link
            href='/brokered'
            className='flex flex-col gap-2 p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors min-w-[200px]'
          >
            <span className='font-serif text-lg'>Brokered</span>
            <span className='text-muted-foreground text-sm'>Single focused reviewer via MCP</span>
          </Link>
        </div>

        <div
          className='absolute pointer-events-auto'
          style={{ left: '60vw', top: '86vh', transform: 'translate(-50%, -50%)' }}
        >
          <Link
            href='/autonomous'
            className='flex flex-col gap-2 p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors min-w-[200px]'
          >
            <span className='font-serif text-lg'>Autonomous</span>
            <span className='text-muted-foreground text-sm'>Full multi-agent deliberation with audit trail</span>
          </Link>
        </div>
      </div>
    </>
  )
}
