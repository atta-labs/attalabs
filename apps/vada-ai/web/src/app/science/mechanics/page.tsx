import { Heading, Text } from '@atta/ui/shared'
import { Separator } from '@atta/ui'
import Link from 'next/link'

export default function ScienceMechanicsPage() {
  return (
    <article className='space-y-16'>
      {/* Header */}
      <div className='space-y-4'>
        <span className='font-mono text-xs text-muted-foreground'>Engine Mechanics</span>
        <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
          How It Works
        </Heading>
        <Text as='p' muted className='text-lg leading-relaxed'>
          The technical architecture behind the deliberation engine — its enforcement layers, anti-drift mechanisms, and
          lifecycle.
        </Text>
      </div>

      <Separator className='opacity-20' />

      {/* The core problem */}
      <section className='space-y-4'>
        <div className='space-y-2'>
          <span className='font-mono text-xs text-muted-foreground'>The Problem</span>
          <Heading level={2} className='font-serif text-2xl font-light'>
            Context Drift
          </Heading>
        </div>
        <Text as='p' className='leading-relaxed text-muted-foreground'>
          In standard multi-round deliberations, agents tend to drift. They begin responding to each other and gradually
          forget the original constraints provided by the Principal — length, tone, format, and scope. This is
          especially pronounced with free or efficient models operating under limited context windows. By Round 3, the
          deliberation can become an echo chamber with increasingly loose adherence to the original question.
        </Text>
      </section>

      <Separator className='opacity-20' />

      {/* Three-layer enforcement */}
      <section className='space-y-8'>
        <div className='space-y-2'>
          <span className='font-mono text-xs text-muted-foreground'>The Solution</span>
          <Heading level={2} className='font-serif text-2xl font-light'>
            Three-Layer Enforcement
          </Heading>
        </div>

        <div className='space-y-1.5'>
          <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
            Layer A — Universal Anchor
          </Text>
          <Text as='p' className='leading-relaxed text-muted-foreground'>
            Instead of placing the Principal's instructions only at the start of the system prompt, a{' '}
            <em className='text-foreground'>Critical Reminder</em> block is appended to the very end of every single
            turn. This exploits the recency bias of language models — by placing the original question and formatting
            rules at the bottom of the prompt, the model reads them milliseconds before it starts generating text,
            dramatically reducing drift across long deliberations.
          </Text>
        </div>

        <div className='space-y-1.5'>
          <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
            Layer B — Meta-Debate Killswitch
          </Text>
          <Text as='p' className='leading-relaxed text-muted-foreground'>
            Contrarian agents (particularly the Devil's Advocate) tend to waste turns arguing that a question is poorly
            defined or that the deliberation framing is flawed. The Meta-Debate Killswitch explicitly forbids this
            behavior. Agents are commanded to participate in the exercise even if they disagree with the framing — they
            must engage with the substance, not the meta-level.
          </Text>
        </div>

        <div className='space-y-1.5'>
          <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
            Layer C — Blind Audit Loop
          </Text>
          <Text as='p' className='leading-relaxed text-muted-foreground'>
            The final conclusion is validated by a Blind Auditor — a zero-knowledge check that sees only the original
            question and the conclusion JSON, never the deliberation transcript. This is intentional: if the auditor saw
            the full chat, it might forgive logical errors because it understood the context. By making it Blind, the
            output is judged strictly against the Principal's original requirements. If the auditor flags a{' '}
            <span className='font-mono text-xs text-foreground'>FLAG</span>, the system triggers a targeted revision
            loop.
          </Text>
        </div>
      </section>

      <Separator className='opacity-20' />

      {/* Lifecycle */}
      <section className='space-y-6'>
        <div className='space-y-2'>
          <span className='font-mono text-xs text-muted-foreground'>Lifecycle</span>
          <Heading level={2} className='font-serif text-2xl font-light'>
            The Deliberation Lifecycle
          </Heading>
        </div>

        <div className='space-y-3'>
          {[
            {
              step: 'Round 1',
              desc: "Independent positions. Zero crosstalk. Each agent speaks from its own posture without access to others' outputs."
            },
            {
              step: 'Rounds 2–3',
              desc: 'Adversarial collision. Forced targeting using [TARGET: Agent] tagging. Premature consensus is architecturally blocked.'
            },
            {
              step: 'Synthesis',
              desc: 'Context-heavy extraction. The Synthesizer identifies convergence and explicitly names unresolved divergence.'
            },
            {
              step: 'Audit',
              desc: 'Blind verification. The Auditor checks the conclusion against the original question with no transcript access.'
            },
            {
              step: 'Revision',
              desc: 'Optional targeted fix. If the Auditor flags an issue, the Synthesizer receives the specific objection and revises only the flawed element.'
            }
          ].map(({ step, desc }) => (
            <div key={step} className='flex gap-6 rounded-lg border border-border/20 bg-card/20 px-5 py-4'>
              <Text as='p' className='font-mono text-xs text-muted-foreground shrink-0 pt-0.5 w-20'>
                {step}
              </Text>
              <Text as='p' size='sm' className='leading-relaxed text-muted-foreground'>
                {desc}
              </Text>
            </div>
          ))}
        </div>
      </section>

      <Separator className='opacity-20' />

      {/* Navigation */}
      <div className='flex items-center justify-between pt-4'>
        <Link
          href='/science/agents'
          className='font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors'
        >
          ← Agents
        </Link>
        <Link
          href='/deliberate'
          className='font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors'
        >
          Start deliberating →
        </Link>
      </div>
    </article>
  )
}
