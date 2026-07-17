import { COMMANDS } from '@atta/vinaya-sources'
import { Badge, Card, CardContent } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import { CommandLine } from './_components/CommandLine'

export default function InstallPage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif'>
          Install
        </Heading>
        <Text className='font-sans' muted>
          Vinaya&rsquo;s command reference.
        </Text>
      </section>

      <section className='flex flex-col gap-4'>
        <Heading level={2} className='font-serif'>
          The only invocation that works today
        </Heading>
        <Card>
          <CardContent className='flex flex-col gap-2'>
            <CommandLine command='bun apps/vinaya/cli/src/index.ts help' />
            <Text size='sm' className='font-sans' muted>
              Clone the monorepo and run the CLI&rsquo;s entry file with Bun. This is the only invocation that works
              today; nothing is published to npm.
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='flex flex-col gap-2'>
            <CommandLine command='npx vinaya init' />
            <Text size='sm' className='font-sans' muted>
              Not runnable today; nothing is published under this name yet. This is the intended entry point once the
              package ships.
            </Text>
          </CardContent>
        </Card>
      </section>

      <section className='flex flex-col gap-4'>
        <Heading level={2} className='font-serif'>
          Commands
        </Heading>
        <Text className='font-sans' muted>
          Every command Vinaya&rsquo;s v1.0 scope commits to. A command is marked Shipped once the CLI actually
          dispatches it &mdash; not because a task was marked done.
        </Text>
        <div className='flex flex-col gap-3'>
          {COMMANDS.map((command) => (
            <Card key={command.name}>
              <CardContent className='flex flex-col gap-3'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <Heading level={3} className='font-serif'>
                    vinaya {command.name}
                  </Heading>
                  {command.status === 'shipped' ? (
                    <Badge className='text-success border-success/40'>Shipped</Badge>
                  ) : (
                    <Badge className='text-warning border-warning/40'>Planned</Badge>
                  )}
                </div>

                <CommandLine command={`vinaya ${command.name}`} />

                <Text size='sm' className='font-sans'>
                  {command.description}
                </Text>

                {command.name === 'init' && (
                  <div className='flex flex-col gap-2'>
                    <Text size='sm' className='font-sans'>
                      It detects your repo, prints the complete diff of every intended change, and waits for your
                      confirmation before installing anything. <code className='font-mono'>--dry-run</code> prints that
                      same diff and installs nothing. Nothing ever runs automatically on package install.
                    </Text>
                    <Text size='sm' className='font-sans'>
                      It installs one CI workflow that runs{' '}
                      <code className='font-mono'>vinaya check --all --diff-only</code>, alongside your existing
                      workflows &mdash; refusing to overwrite rather than touching foreign content already at that path.
                      Git hook stubs invoke the <code className='font-mono'>vinaya</code> binary directly; if a hook
                      already exists, it appends a delimited managed block, shown verbatim in the diff first, rather
                      than overwriting it.
                    </Text>
                    <Text size='sm' className='font-sans'>
                      <code className='font-mono'>vinaya.config.json</code> is seeded with a starter ruleset extracted
                      from Vinaya&rsquo;s own battle-tested gates, not invented defaults. Issue and PR templates
                      carrying the brief schema are added alongside your own; tier and{' '}
                      <code className='font-mono'>needs:*-input</code> labels are created only if they don&rsquo;t
                      already exist &mdash; your existing labels are never modified.
                    </Text>
                    <Text size='sm' className='font-sans'>
                      An adopter decision-log scaffold is added. The recommended branch-protection command is printed
                      for you to run yourself &mdash; it is never applied, and your PATH is never touched.{' '}
                      <code className='font-mono'>eject</code> removes exactly the managed block it owns, or a whole
                      file only if <code className='font-mono'>init</code> created it.
                    </Text>
                  </div>
                )}

                {command.flags && command.flags.length > 0 && (
                  <div className='flex flex-col gap-1'>
                    <Text size='sm' weight='bold' className='font-sans'>
                      Options
                    </Text>
                    <div className='flex flex-col gap-1 pl-4'>
                      {command.flags.map((flag) => (
                        <div key={flag.flag} className='flex flex-wrap items-baseline gap-2'>
                          <Text as='span' size='xs' className='font-mono' muted>
                            {flag.flag}
                          </Text>
                          <Text as='span' size='xs' className='font-sans' muted>
                            {flag.description}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
