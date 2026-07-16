import { COMMANDS } from '@atta/vinaya-cli/commands'
import { Badge, Card, CardContent } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function InstallPage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-10 px-6 py-24'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Install
        </Heading>
        <Text className='font-sans text-muted-foreground'>
          Vinaya's command reference, rendered from the same registry <code className='font-mono'>vinaya help</code>{' '}
          reads &mdash; every entry below gets more accurate on its own as each command ships, with no edit to this
          page.
        </Text>
      </section>

      <section className='flex flex-col gap-4'>
        <Heading level={2} className='font-serif text-xl text-foreground'>
          The only invocation that works today
        </Heading>
        <Card className='border-border bg-card'>
          <CardContent className='flex flex-col gap-2 p-6'>
            <Text as='span' className='font-mono text-muted-foreground'>
              $
            </Text>
            <Text as='span' weight='bold' className='font-mono text-foreground'>
              bun apps/vinaya/cli/src/index.ts help
            </Text>
            <Text size='sm' className='font-sans text-muted-foreground'>
              Clone the monorepo, then run the CLI's entry file directly with Bun. There is no install today, for any
              command &mdash; including this one and <code className='font-mono'>version</code>. Nothing is published:
              the npm registry has no <code className='font-mono'>vinaya</code> or{' '}
              <code className='font-mono'>@vinaya/cli</code> package.
            </Text>
          </CardContent>
        </Card>

        <Card className='border-border bg-card'>
          <CardContent className='flex flex-col gap-2 p-6'>
            <Text as='span' className='font-mono text-muted-foreground'>
              $
            </Text>
            <Text as='span' weight='bold' className='font-mono text-foreground'>
              npx vinaya init
            </Text>
            <Text size='sm' className='font-sans text-muted-foreground'>
              Not runnable today &mdash; nothing is published under this name yet. This is the intended entry point once
              the package ships, not a command you can run now.
            </Text>
          </CardContent>
        </Card>
      </section>

      <section className='flex flex-col gap-4'>
        <Heading level={2} className='font-serif text-xl text-foreground'>
          Commands
        </Heading>
        <Text className='font-sans text-muted-foreground'>
          Every command Vinaya's v1.0 scope commits to, and its real status against{' '}
          <code className='font-mono'>index.ts</code>'s router today.
        </Text>
        <div className='flex flex-col gap-3'>
          {COMMANDS.map((command) => (
            <Card key={command.name} className='border-border bg-card'>
              <CardContent className='flex flex-col gap-2 p-6'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <Text as='span' weight='bold' className='font-mono text-card-foreground'>
                    vinaya {command.name}
                  </Text>
                  {command.status === 'shipped' ? (
                    <Badge className='text-success border-success/40'>Shipped</Badge>
                  ) : (
                    <Badge className='text-warning border-warning/40'>Planned &mdash; not yet implemented</Badge>
                  )}
                </div>
                <Text size='sm' className='font-sans text-card-foreground'>
                  {command.description}
                </Text>
                {command.flags && command.flags.length > 0 && (
                  <div className='flex flex-col gap-1 pl-4'>
                    {command.flags.map((flag) => (
                      <div key={flag.flag} className='flex flex-wrap items-baseline gap-2'>
                        <Text as='span' size='xs' className='font-mono text-muted-foreground'>
                          {flag.flag}
                        </Text>
                        <Text as='span' size='xs' className='font-sans text-muted-foreground'>
                          {flag.description}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className='border-t border-border pt-10'>
        <Link href='/' className='inline-flex items-center gap-1 text-sm text-foreground hover:text-accent'>
          <ArrowLeft className='h-3.5 w-3.5' />
          Back to Vinaya
        </Link>
      </section>
    </main>
  )
}
