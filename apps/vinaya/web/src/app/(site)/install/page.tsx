import { COMMANDS } from '@atta/vinaya-sources'
import { Badge, Card, CardContent } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'

export default function InstallPage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif'>
          Install
        </Heading>
        <Text className='font-sans' muted>
          What Vinaya's CLI can do today, and what <code className='font-mono'>vinaya init</code> will install once it
          ships (Issue #384) &mdash; every entry below stays accurate on its own as each command ships, with no edit to
          this page.
        </Text>
      </section>

      <section className='flex flex-col gap-4'>
        <Heading level={2} className='font-serif'>
          The only invocation that works today
        </Heading>
        <Card>
          <CardContent className='flex flex-col gap-2'>
            <Text as='span' className='font-mono' muted>
              $
            </Text>
            <Text as='span' weight='bold' className='font-mono'>
              bun apps/vinaya/cli/src/index.ts help
            </Text>
            <Text size='sm' className='font-sans' muted>
              Clone the monorepo, then run the CLI's entry file directly with Bun. There is no install today, for any
              command &mdash; including this one and <code className='font-mono'>version</code>. Nothing is published:
              the npm registry has no <code className='font-mono'>vinaya</code> or{' '}
              <code className='font-mono'>@vinaya/cli</code> package.
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='flex flex-col gap-2'>
            <Text as='span' className='font-mono' muted>
              $
            </Text>
            <Text as='span' weight='bold' className='font-mono'>
              npx vinaya init
            </Text>
            <Text size='sm' className='font-sans' muted>
              Not runnable today &mdash; nothing is published under this name yet. This is the intended entry point once
              the package ships, not a command you can run now.
            </Text>
          </CardContent>
        </Card>
      </section>

      <section className='flex flex-col gap-4'>
        <Heading level={2} className='font-serif'>
          What vinaya init will do
        </Heading>
        <Text className='font-sans' muted>
          Unbuilt &mdash; Issue #384 is open, nothing merged. Everything below is future tense: what{' '}
          <code className='font-mono'>init</code> will do once it ships, never what it does today.
        </Text>
        <Text className='font-sans'>
          <code className='font-mono'>init</code> will detect your git repo and your{' '}
          <code className='font-mono'>gh</code> auth status, then print the complete diff of every change it intends to
          make and wait for your confirmation before installing anything. <code className='font-mono'>--dry-run</code>{' '}
          prints that same diff and installs nothing; <code className='font-mono'>--yes</code> skips the confirmation
          prompt. Nothing ever runs on package install &mdash; there is no postinstall step.
        </Text>
      </section>

      <section className='flex flex-col gap-4'>
        <Heading level={2} className='font-serif'>
          What it installs, and how it respects your repo
        </Heading>
        <Text className='font-sans' muted>
          Every artifact&rsquo;s never-clobber rule, from Issue #384&rsquo;s install manifest:
        </Text>
        <div className='flex flex-col gap-4'>
          <div>
            <Text weight='bold' className='font-sans'>
              CI workflow &mdash; <code className='font-mono'>.github/workflows/vinaya.yml</code>
            </Text>
            <Text size='sm' className='font-sans' muted>
              Runs <code className='font-mono'>vinaya check --all --diff-only</code>. If foreign content already exists
              at that path, init refuses to overwrite it &mdash; it never touches any of your other workflows.
            </Text>
          </div>
          <div>
            <Text weight='bold' className='font-sans'>
              Git hooks
            </Text>
            <Text size='sm' className='font-sans' muted>
              Thin stubs that invoke the installed <code className='font-mono'>vinaya</code> binary &mdash; never
              inlined check logic. If a hook file already exists, init appends a delimited managed block, shown verbatim
              in the diff before anything is written; if none exists, it generates the stub fresh. Existing hook content
              is never clobbered.
            </Text>
          </div>
          <div>
            <Text weight='bold' className='font-sans'>
              Config &mdash; <code className='font-mono'>vinaya.config.json</code>
            </Text>
            <Text size='sm' className='font-sans' muted>
              Seeded with a starter ruleset extracted from this repo&rsquo;s own real gates, not invented defaults.
            </Text>
          </div>
          <div>
            <Text weight='bold' className='font-sans'>
              Issue &amp; PR templates
            </Text>
            <Text size='sm' className='font-sans' muted>
              Carry the brief schema. The issue template is a new file only, never touching your existing templates; the
              PR template follows the same managed-block/refuse-if-foreign rule as hooks, since GitHub allows only one.
            </Text>
          </div>
          <div>
            <Text weight='bold' className='font-sans'>
              Labels
            </Text>
            <Text size='sm' className='font-sans' muted>
              Tier labels and the <code className='font-mono'>needs:*-input</code> family &mdash; created if absent;
              existing labels are never modified.
            </Text>
          </div>
          <div>
            <Text weight='bold' className='font-sans'>
              Adopter decision-log scaffold
            </Text>
            <Text size='sm' className='font-sans' muted>
              New files &mdash; nothing existing is touched.
            </Text>
          </div>
          <div>
            <Text weight='bold' className='font-sans'>
              Branch protection
            </Text>
            <Text size='sm' className='font-sans' muted>
              The recommended command is printed for you to run yourself &mdash; never applied.
            </Text>
          </div>
          <div>
            <Text weight='bold' className='font-sans'>
              <code className='font-mono'>eject</code>
            </Text>
            <Text size='sm' className='font-sans' muted>
              Removes exactly the managed block, or a file only if <code className='font-mono'>init</code> created it.
            </Text>
          </div>
        </div>
        <Text size='sm' className='font-sans' muted>
          It never touches your PATH, and it never writes branch protection for you.
        </Text>
      </section>

      <section className='flex flex-col gap-4'>
        <Heading level={2} className='font-serif'>
          Commands
        </Heading>
        <Text className='font-sans' muted>
          Every command Vinaya's v1.0 scope commits to, and its real status against{' '}
          <code className='font-mono'>index.ts</code>'s router today.
        </Text>
        <div className='flex flex-col gap-3'>
          {COMMANDS.map((command) => (
            <Card key={command.name}>
              <CardContent className='flex flex-col gap-2'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <Text as='span' weight='bold' className='font-mono'>
                    vinaya {command.name}
                  </Text>
                  {command.status === 'shipped' ? (
                    <Badge className='text-success border-success/40'>Shipped</Badge>
                  ) : (
                    <Badge className='text-warning border-warning/40'>Planned &mdash; not yet implemented</Badge>
                  )}
                </div>
                <Text size='sm' className='font-sans'>
                  {command.description}
                </Text>
                {command.flags && command.flags.length > 0 && (
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
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
