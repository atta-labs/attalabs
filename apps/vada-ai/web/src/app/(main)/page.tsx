import Link from 'next/link'

export default function VadaChooserPage() {
  return (
    <main className='flex flex-col items-center justify-center min-h-[60vh] gap-10 p-8'>
      <div className='flex flex-col items-center gap-3'>
        <h1 className='font-serif text-4xl'>Vāda</h1>
        <p className='text-muted-foreground text-center max-w-sm'>
          Structured multi-agent deliberation. Choose your mode.
        </p>
      </div>
      <div className='flex flex-col sm:flex-row gap-4'>
        <Link
          href='/autonomous'
          className='flex flex-col gap-2 p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors min-w-[200px]'
        >
          <span className='font-serif text-lg'>Autonomous</span>
          <span className='text-muted-foreground text-sm'>Full multi-agent deliberation with audit trail</span>
        </Link>
        <Link
          href='/brokered'
          className='flex flex-col gap-2 p-6 rounded-lg border border-border bg-card hover:bg-accent transition-colors min-w-[200px]'
        >
          <span className='font-serif text-lg'>Brokered</span>
          <span className='text-muted-foreground text-sm'>Single focused reviewer via MCP</span>
        </Link>
      </div>
    </main>
  )
}
