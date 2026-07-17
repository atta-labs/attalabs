import { COMMANDS } from '@atta/vinaya-sources'
import { Badge } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import { CommandBlock } from './_components/CommandBlock'

// `init` leads the page — it is the install, so its reference entry stands in
// for a separate top "install" section rather than sitting wherever the
// registry happens to list it.
const ORDERED_COMMANDS = [...COMMANDS].sort((a, b) => (a.name === 'init' ? -1 : b.name === 'init' ? 1 : 0))

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

      <section className='flex flex-col gap-8'>
        {ORDERED_COMMANDS.map((command) => {
          const synopsis = command.name === 'init' ? `npx vinaya ${command.name}` : `vinaya ${command.name}`
          return (
            <div key={command.name} className='flex flex-col gap-3'>
              <div className='flex flex-wrap items-center gap-3'>
                <Heading level={3} className='font-serif'>
                  {command.name}
                </Heading>
                {command.status === 'shipped' ? (
                  <Badge className='text-success border-success/40'>Shipped</Badge>
                ) : (
                  <Badge className='text-warning border-warning/40'>Coming soon</Badge>
                )}
              </div>

              <CommandBlock command={synopsis} />

              <Text className='font-sans'>{command.description}</Text>

              {command.name === 'init' && (
                <div className='flex flex-col gap-2'>
                  <Text className='font-sans'>
                    It detects your repo, prints the complete diff of every intended change, and waits for your
                    confirmation before installing anything. <code className='font-mono'>--dry-run</code> prints that
                    same diff and installs nothing. Nothing ever runs automatically on package install.
                  </Text>
                  <Text className='font-sans'>
                    It installs one CI workflow that runs{' '}
                    <code className='font-mono'>vinaya check --all --diff-only</code>, alongside your existing workflows
                    &mdash; refusing to overwrite rather than touching foreign content already at that path. Git hook
                    stubs invoke the <code className='font-mono'>vinaya</code> binary directly; if a hook already
                    exists, it appends a delimited managed block, shown verbatim in the diff first, rather than
                    overwriting it.
                  </Text>
                  <Text className='font-sans'>
                    <code className='font-mono'>vinaya.config.json</code> is seeded with a starter ruleset extracted
                    from Vinaya&rsquo;s own battle-tested gates, not invented defaults. Issue and PR templates carrying
                    the brief schema are added alongside your own; tier and{' '}
                    <code className='font-mono'>needs:*-input</code> labels are created only if they don&rsquo;t already
                    exist &mdash; your existing labels are never modified.
                  </Text>
                  <Text className='font-sans'>
                    An adopter decision-log scaffold is added. The recommended branch-protection command is printed for
                    you to run yourself &mdash; it is never applied, and your PATH is never touched.{' '}
                    <code className='font-mono'>eject</code> removes exactly the managed block it owns, or a whole file
                    only if <code className='font-mono'>init</code> created it.
                  </Text>
                </div>
              )}

              {command.flags && command.flags.length > 0 && (
                <div className='flex flex-col gap-1'>
                  <Text weight='bold' className='font-sans'>
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
            </div>
          )
        })}
      </section>
    </main>
  )
}
