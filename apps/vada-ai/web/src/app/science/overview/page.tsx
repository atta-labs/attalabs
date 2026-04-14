import { Heading, Text } from '@atta/ui/shared'
import { Separator } from '@atta/ui'
import Link from 'next/link'

export default function ScienceOverviewPage() {
  return (
    <article className='space-y-16'>
      {/* Hero */}
      <div className='space-y-4'>
        <span className='font-mono text-xs text-muted-foreground'>Fundamental Theory</span>
        <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
          The Science of Deliberation
        </Heading>
        <Text as='p' muted className='text-lg leading-relaxed'>
          Why structured friction produces better decisions than single-agent consensus.
        </Text>
      </div>

      <Separator className='opacity-20' />

      {/* Section: The Problem */}
      <section className='space-y-6'>
        <div className='space-y-2'>
          <span className='font-mono text-xs text-muted-foreground'>01</span>
          <Heading level={2} className='font-serif text-2xl font-light'>
            The Problem: Persona Collapse
          </Heading>
        </div>

        <Text as='p' className='leading-relaxed text-muted-foreground'>
          When a single AI model is asked to debate itself, it cannot generate genuine disagreement. Its probability
          distribution converges toward the neutral average of all training data — producing what researchers call a{' '}
          <em className='text-foreground'>hallucination of agreement</em>. The model appears to reason from multiple
          perspectives, but it is actually averaging them into comfortable, non-committal positions that satisfy no one.
        </Text>

        <Text as='p' className='leading-relaxed text-muted-foreground'>
          This is not a limitation of any particular model. It is a structural property of how language models generate
          text. The same weights that enable fluid reasoning also prevent the kind of sustained adversarial commitment
          required for productive intellectual friction.
        </Text>

        <blockquote className='border-l-4 border-border pl-6 py-2'>
          <Text as='p' className='font-serif text-lg italic text-foreground/80 leading-relaxed'>
            "Real insight is not found in the average of two opinions, but in the white-hot friction created when two
            opposing truths collide without compromise."
          </Text>
        </blockquote>
      </section>

      <Separator className='opacity-20' />

      {/* Section: The Solution */}
      <section className='space-y-6'>
        <div className='space-y-2'>
          <span className='font-mono text-xs text-muted-foreground'>02</span>
          <Heading level={2} className='font-serif text-2xl font-light'>
            The Solution: Cognitive Quarantine
          </Heading>
        </div>

        <Text as='p' className='leading-relaxed text-muted-foreground'>
          Vāda solves persona collapse through strict cognitive isolation. Each agent is instantiated with a distinct
          role identity, separate context buffer, and explicit constraints that prevent logic contamination between
          agents. This architecture is called <em className='text-foreground'>Cognitive Quarantine</em>.
        </Text>

        <div className='space-y-4 rounded-lg border border-border/20 bg-card/30 p-6'>
          <div className='space-y-2'>
            <Text as='p' className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>
              Logical Isolation
            </Text>
            <Text as='p' className='leading-relaxed text-muted-foreground'>
              Agents operate with separate memory buffers. No agent reads the internal reasoning of another — only their
              outputs. This preserves perspective purity across the full deliberation lifecycle.
            </Text>
          </div>

          <Separator className='opacity-20' />

          <div className='space-y-2'>
            <Text as='p' className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>
              Dialectic Friction
            </Text>
            <Text as='p' className='leading-relaxed text-muted-foreground'>
              The system enforces adversarial critique before any synthesis occurs. Agents are required to target each
              other's claims using structured tagging (
              <span className='font-mono text-xs text-foreground'>[TARGET: Agent]</span>) in rounds 2 and 3. Premature
              consensus is architecturally impossible.
            </Text>
          </div>
        </div>

        <Text as='p' className='leading-relaxed text-muted-foreground'>
          The result is a deliberation where disagreement is structural, not performative — where each agent is
          genuinely committed to its position until the evidence demands otherwise.
        </Text>
      </section>

      <Separator className='opacity-20' />

      {/* Navigation footer */}
      <div className='flex items-center justify-between pt-4'>
        <Text as='p' size='xs' muted className='font-mono'>
          Next: Frameworks →
        </Text>
        <Link
          href='/science/frameworks'
          className='font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors'
        >
          Deliberative Frameworks
        </Link>
      </div>
    </article>
  )
}
