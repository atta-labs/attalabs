import { Heading, Text } from '@atta/ui/components'
import { Button } from '@atta/ui/components'
import Link from 'next/link'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { TwoColumnSection } from '../primitives/TwoColumnSection'

export function McpDeveloperSection() {
  return (
    <SectionWrapper id='mcp-developer'>
      <TwoColumnSection
        left={
          <div className='flex flex-col gap-8'>
            <SectionLabel>04 / For Developers</SectionLabel>
            <Heading level={2} className='font-serif text-4xl md:text-5xl text-foreground leading-tight'>
              Use Vāda from any AI assistant.
            </Heading>
            <Text as='p' className='text-muted-foreground max-w-xl leading-relaxed'>
              Vāda exposes a hosted MCP server. Connect it to Claude, Cursor, or any MCP-compatible client. Your AI
              assistant can run Vāda deliberations as a tool call.
            </Text>
            <div>
              <Button variant='outline' asChild>
                <Link href='/mcp'>View MCP setup</Link>
              </Button>
            </div>
          </div>
        }
        right={
          <div className='border border-border rounded-md p-5 flex flex-col gap-3 font-mono text-sm mt-4 md:mt-16'>
            <Text as='small' className='font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
              Tool call example
            </Text>
            <div className='flex flex-col gap-1'>
              <Text as='p' className='text-success'>
                vada__deliberate
              </Text>
              <Text as='p' className='text-muted-foreground pl-2'>
                question: &quot;Should we expand to Europe now?&quot;
              </Text>
              <Text as='p' className='text-muted-foreground pl-2'>
                spec_id: &quot;vada-reviewers-synthesis&quot;
              </Text>
            </div>
            <div className='h-px bg-border' />
            <Text as='p' className='text-muted-foreground text-xs leading-relaxed'>
              Returns: full deliberation transcript + synthesized verdict
            </Text>
          </div>
        }
      />
    </SectionWrapper>
  )
}
