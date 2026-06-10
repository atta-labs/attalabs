import { Text } from '@atta/ui/components'
import { ArrowDown } from 'lucide-react'

const EXECUTION_TOOLS = 'SKILLS · SWARMS · PLUGINS · MCP · BROWSERS · RUNNERS'

export function PositioningDiagram() {
  return (
    <div className='flex flex-col gap-3'>
      <div className='overflow-hidden rounded-md border border-border bg-background/40'>
        <div className='flex items-center justify-between border-b border-secondary/40 bg-background/60 px-6 py-6'>
          <Text as='p' className='font-mono uppercase tracking-widest text-sm text-secondary'>
            Deliberation Layer
          </Text>
          <Text as='small' className='font-serif text-secondary'>
            Vāda
          </Text>
        </div>

        <div className='flex items-center justify-center gap-2 border-b border-border bg-background/20 px-6 py-3'>
          <Text as='small' className='font-mono uppercase tracking-widest text-[10px] text-muted-foreground'>
            Conclusion
          </Text>
          <ArrowDown className='size-3.5 text-muted-foreground' aria-hidden />
        </div>

        <div className='flex flex-col items-center gap-2 px-6 py-6'>
          <Text as='p' className='font-mono uppercase tracking-widest text-sm text-muted-foreground'>
            Execution Layer
          </Text>
          <Text
            as='small'
            className='whitespace-nowrap font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70'
          >
            {EXECUTION_TOOLS}
          </Text>
        </div>
      </div>

      <Text as='small' className='self-end font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60'>
        SYS.V1_STABLE {'//'} NO_EXIT_TRAFFIC
      </Text>
    </div>
  )
}
