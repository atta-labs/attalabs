import { Text } from '@atta/ui'
import { FlowArrow } from '../primitives/FlowArrow'

const EXECUTION_TOOLS = 'SKILLS · SWARMS · PLUGINS · MCP · BROWSERS · RUNNERS'

export function PositioningDiagram() {
  return (
    <div className='flex flex-col gap-4'>
      <div className='rounded-md border border-success/40 bg-background/60 px-6 py-7'>
        <div className='flex justify-end'>
          <Text as='small' className='font-serif text-success'>
            Vāda
          </Text>
        </div>
        <Text as='p' className='mt-6 text-center font-mono uppercase tracking-widest text-sm text-success'>
          Deliberation Layer
        </Text>
      </div>

      <div className='flex flex-col items-center gap-1'>
        <span className='rounded-sm border border-border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
          Conclusion
        </span>
        <FlowArrow />
      </div>

      <div className='rounded-md border border-border bg-background/30 px-6 py-7'>
        <Text as='p' className='text-center font-mono uppercase tracking-widest text-sm text-muted-foreground'>
          Execution Layer
        </Text>
        <Text
          as='small'
          className='mt-3 block whitespace-nowrap text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70'
        >
          {EXECUTION_TOOLS}
        </Text>
      </div>

      <Text
        as='small'
        className='mt-2 self-end font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60'
      >
        SYS.V1_STABLE {'//'} NO_EXIT_TRAFFIC
      </Text>
    </div>
  )
}
