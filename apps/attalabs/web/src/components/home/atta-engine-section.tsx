import { Heading, Text } from '@atta/ui/shared'

const LAYERS: [string, string][] = [
  ['YAML Config', 'Team definitions compiled into executable plans'],
  ['Plan Compiler', 'Validates structure, builds the execution graph'],
  ['LangGraph', 'State machine executes the compiled plan'],
  ['Cognitive Router', 'Intent · tool filtering · budget · cost per turn'],
  ['Audit Trail', 'Structured conclusions with full deliberation transcript']
]

export function AttaEngineSection() {
  return (
    <section className='bg-card/30 px-6 py-24'>
      <div className='mx-auto max-w-6xl'>
        <div className='grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16'>
          <div className='flex flex-col gap-8'>
            <Text as='p' className='font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
              02 / Atta Engine
            </Text>
            <Heading level={2} className='font-serif text-4xl leading-tight text-foreground md:text-5xl'>
              YAML-driven deliberation.
            </Heading>
            <div className='flex flex-col gap-4'>
              <Text as='p' className='text-base leading-relaxed text-muted-foreground'>
                The Atta engine is a runtime for multi-agent deliberation. It compiles YAML team configurations into
                executable plans, runs them through a LangGraph state machine, and routes per-turn calls through a
                cognitive router — intent classification, tool filtering, budget enforcement, cost tracking.
              </Text>
              <Text as='p' className='text-base leading-relaxed text-muted-foreground'>
                The engine has zero branches on workflow type. Every variation between deliberations — number of agents,
                rounds, audit configuration, synthesis behavior — lives in YAML. Adding a new deliberation pattern is
                creating a YAML file, not changing engine code.
              </Text>
            </div>
            <blockquote className='border-l-4 border-border py-1 pl-5'>
              <Text as='p' className='italic leading-relaxed text-foreground'>
                One substrate. Different surfaces.
              </Text>
            </blockquote>
          </div>

          <div className='flex flex-col justify-center gap-6'>
            <Text as='p' className='font-mono text-xs uppercase tracking-widest text-muted-foreground/40'>
              Architecture layers
            </Text>
            <div className='flex flex-col gap-3'>
              {LAYERS.map(([layer, desc]) => (
                <div key={layer} className='border-l border-border pl-4'>
                  <Text as='p' className='font-mono text-xs text-foreground/70'>
                    {layer}
                  </Text>
                  <Text as='p' className='text-sm text-muted-foreground'>
                    {desc}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
