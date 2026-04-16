import { Heading, Text } from '@atta/ui/shared'
import { Separator } from '@atta/ui'
import Link from 'next/link'

const FRAMEWORKS = [
  {
    number: '01',
    name: 'Hegelian Dialectic',
    summary: 'Thesis encounters antithesis. Synthesis emerges from the collision.',
    body: `Georg Hegel's dialectical method proposes that truth is not static — it emerges from the
    productive tension between opposing propositions. A thesis is advanced, challenged by its
    antithesis, and from their confrontation arises a synthesis that transcends both. Vāda's
    three-round structure encodes this directly: Round 1 establishes independent positions
    (thesis), Rounds 2–3 force adversarial collision (antithesis), and the Synthesizer extracts
    the emergent conclusion (synthesis).`
  },
  {
    number: '02',
    name: 'Six Thinking Hats',
    summary: 'Parallel cognitive constraints force full-spectrum evaluation.',
    body: `Edward de Bono's framework assigns distinct cognitive modes to thinkers in a group —
    analytical, creative, critical, optimistic, process-oriented, and managerial. By separating
    these modes, the method prevents any single frame from dominating. Each Vāda agent embodies
    a cognitive posture (strategic, critical, contrarian, synthetic) that operates as a permanent
    hat — not a temporary role to be set aside when inconvenient.`
  },
  {
    number: '03',
    name: 'Military Red Teaming',
    summary: 'Adversarial stress-testing surfaces hidden vulnerabilities.',
    body: `Red teaming originated in Cold War military strategy as a method for identifying weaknesses
    in plans by simulating adversarial attack. The Devil's Advocate agent in Vāda operates on
    this principle — it is not simply skeptical, it is structurally committed to discovering
    failure modes. The Meta-Debate Killswitch enforces this further: the Devil's Advocate cannot
    retreat into meta-commentary about the question's framing. It must engage directly.`
  },
  {
    number: '04',
    name: 'The Synthesizer Protocol',
    summary: 'Coherence extraction resolves contradiction into actionable form.',
    body: `Once adversarial rounds complete, a synthesis agent with a separate, lower temperature
    (0.2) distills the transcript into a structured conclusion — recommendation, key condition,
    and unresolved points. The Synthesizer does not average or compromise; it identifies
    convergence where it exists and names divergence where it does not. A Blind Auditor then
    validates the output against the original question with zero access to the deliberation
    transcript, preventing the Synthesizer from papering over genuine disagreement.`
  }
]

export default function ScienceFrameworksPage() {
  return (
    <article className='space-y-8'>
      {/* Header */}
      <div className='space-y-4'>
        <span className='font-mono text-xs text-muted-foreground'>Deliberative Frameworks</span>
        <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
          Intellectual Traditions
        </Heading>
        <Text as='p' muted className='text-lg leading-relaxed'>
          Four philosophical frameworks that underpin the Vāda deliberation architecture.
        </Text>
      </div>

      <Separator className='opacity-20' />

      {/* Framework list */}
      <div className='space-y-16'>
        {FRAMEWORKS.map((f) => (
          <section key={f.number} className='space-y-4'>
            <div className='flex items-start gap-6'>
              <span className='font-mono text-xs text-muted-foreground pt-1 shrink-0'>{f.number}</span>
              <div className='space-y-2'>
                <Heading level={2} className='font-serif text-2xl font-light'>
                  {f.name}
                </Heading>
                <Text as='p' className='font-mono text-sm text-muted-foreground'>
                  {f.summary}
                </Text>
              </div>
            </div>

            <Text as='p' className='leading-relaxed text-muted-foreground pl-10'>
              {f.body}
            </Text>
          </section>
        ))}
      </div>

      <Separator className='opacity-20' />

      {/* Navigation */}
      <div className='flex items-center justify-between pt-4'>
        <Link
          href='/science/overview'
          className='font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors'
        >
          ← Overview
        </Link>
        <Link
          href='/science/agents'
          className='font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors'
        >
          Agents →
        </Link>
      </div>
    </article>
  )
}
