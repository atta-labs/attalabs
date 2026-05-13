import { Heading, Text } from '@atta/ui/shared'

export function HowWeBuild() {
  return (
    <section className='px-6 py-24'>
      <div className='mx-auto max-w-2xl'>
        <Text as='p' className='mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
          02 / How we build
        </Text>
        <Heading level={2} className='mb-8 font-serif text-2xl text-foreground'>
          Build in public. Decide in the open.
        </Heading>
        <Text as='p' className='mb-6 text-base leading-relaxed text-muted-foreground'>
          AttaLabs builds in public. Specs, decisions, and reviewer rounds live in the repo. Every architectural choice
          is logged with the alternatives that were rejected. When a decision is reversed, the reversal is logged too.
          Nothing is retroactively edited; the history is the audit trail.
        </Text>
        <Text as='p' className='mb-6 text-base leading-relaxed text-muted-foreground'>
          The lab works with multiple AI collaborators simultaneously — Claude, Gemini, Grok, DeepSeek, ChatGPT. The
          pattern that became Vāda was discovered by running adversarial reviewer rounds across these models on real
          strategic questions. The product is now what the lab uses to build itself.
        </Text>
        <Text as='p' className='text-sm italic text-muted-foreground/60'>
          The lab is the working pattern. Vāda is what we extracted from it.
        </Text>
      </div>
    </section>
  )
}
