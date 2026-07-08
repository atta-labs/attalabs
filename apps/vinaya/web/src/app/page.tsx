import { Badge, Card, CardContent } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight, Terminal } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-16 px-6 py-24'>
      <section className='flex flex-col gap-6'>
        <Badge variant='outline' className='w-fit font-mono text-xs uppercase tracking-wide text-muted-foreground'>
          Branch protection for the AI era.
        </Badge>
        <Heading level={1} className='font-serif text-4xl text-foreground sm:text-5xl'>
          Agents obey checkers, not documents.
        </Heading>
        <Text size='lg' className='font-sans text-foreground'>
          Install Vinaya and every coding agent must satisfy the same deterministic rules before merge.
        </Text>
        <Text className='font-sans text-muted-foreground'>
          We don&rsquo;t block agents &mdash; we redirect them into a governed flow, so you review judgment, not
          compliance.
        </Text>
      </section>

      <section className='flex flex-col gap-4 border-t border-border pt-10'>
        <Text as='p' className='font-serif text-xl text-foreground'>
          Vinaya lets you trust AI agents to work inside your engineering process without becoming their compliance
          officer.
        </Text>
        <Text size='sm' className='font-mono text-muted-foreground'>
          sits underneath Cursor/Claude Code/Codex/Gemini CLI/GitHub, replaces none of them.
        </Text>
      </section>

      <section className='flex flex-col gap-4 border-t border-border pt-10'>
        <Card className='border-border bg-card'>
          <CardContent className='flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-3'>
              <Terminal className='h-4 w-4 text-muted-foreground' />
              <Text className='font-mono text-card-foreground'>npx vinaya init</Text>
            </div>
            <Badge variant='outline' className='w-fit border-primary/40 text-primary'>
              Coming soon
            </Badge>
          </CardContent>
        </Card>
        <Text size='sm' className='font-sans text-muted-foreground'>
          No CLI exists yet &mdash; this command isn&rsquo;t runnable today. See the{' '}
          <Link href='/known-limits' className='text-foreground underline hover:text-accent'>
            Known Limits
          </Link>{' '}
          page for what&rsquo;s built so far.
        </Text>
      </section>

      <section className='border-t border-border pt-10'>
        <Link href='/aeg' className='inline-flex items-center gap-1 text-sm text-foreground hover:text-accent'>
          Read the AEG methodology
          <ArrowRight className='h-3.5 w-3.5' />
        </Link>
      </section>
    </main>
  )
}
