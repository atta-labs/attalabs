import { Button } from '@atta/ui/components/button'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'

const TEAMS = ['Crucible', 'Sparring', 'Reviewers', 'Reviewers + Synthesis', 'War Room']

export function VadaTeamsBlurb() {
  return (
    <section className='px-6 py-24'>
      <div className='mx-auto max-w-6xl'>
        <div className='grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16'>
          <div className='flex flex-col gap-8'>
            <Text as='p' className='font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
              01 / Vāda on Teams
            </Text>
            <Heading level={2} className='font-serif text-4xl leading-tight text-foreground md:text-5xl'>
              Multi-agent deliberation, packaged as callable teams.
            </Heading>
            <div className='flex flex-col gap-4'>
              <Text as='p' className='text-base leading-relaxed text-muted-foreground'>
                Vāda is the first product built on the Atta engine. It packages multi-agent deliberation into callable
                teams: Reviewers, Crucible, Sparring, War Room, and more. Each team is a YAML configuration the engine
                compiles into a runnable plan.
              </Text>
              <Text as='p' className='text-base leading-relaxed text-muted-foreground'>
                Use Vāda from the web app, or via MCP from Claude.ai, Cursor, and other AI assistants.
              </Text>
            </div>
            <div>
              <a href='https://vada.attalabs.dev' target='_blank' rel='noopener noreferrer'>
                <Button className='gap-2'>
                  Open Vāda
                  <ArrowRight className='h-4 w-4' />
                </Button>
              </a>
            </div>
          </div>

          <div className='flex flex-col justify-center gap-6'>
            <Text as='p' className='font-mono text-xs uppercase tracking-widest text-muted-foreground/40'>
              Published teams
            </Text>
            <div className='flex flex-col gap-3 border-l border-border pl-5'>
              {TEAMS.map((team) => (
                <Text key={team} as='p' className='text-foreground'>
                  {team}
                </Text>
              ))}
            </div>
            <Text as='p' className='mt-2 text-xs text-muted-foreground/50'>
              Vendor-diverse review — Gemini · GPT · Grok · Claude. Auditable deliberation transcripts.
            </Text>
          </div>
        </div>
      </div>
    </section>
  )
}
