import { COMMANDS } from '@atta/vinaya-sources'
import { Badge, Code } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { CommandBlock } from './_components/CommandBlock'
import { DetailText } from './_components/DetailText'
import { commandSlug } from './_components/command-slug'
import { InstallSidebar } from './_components/InstallSidebar'

// `init` leads the page — it is the install, so its reference entry stands in
// for a separate top "install" section rather than sitting wherever the
// registry happens to list it.
const ORDERED_COMMANDS = [...COMMANDS].sort((a, b) => (a.name === 'init' ? -1 : b.name === 'init' ? 1 : 0))

export default function InstallPage() {
  return (
    // Two-pane command reference on `lg:`, mirroring the `/docs` layout: a
    // flush-left, full-height command sidebar with its own scroll beside a
    // content pane that scrolls independently (`lg:h-full … lg:overflow-hidden`
    // fills the (site) shell's scroll region exactly, so neither the whole page
    // nor a stray top gutter scrolls — each pane owns its scroll). Below `lg`
    // the sidebar is hidden and the whole thing collapses to the same centered
    // `max-w-3xl` scrolling column the page has always been (`main`'s `px-6
    // py-12` + the inner `mx-auto max-w-3xl gap-10` reproduce it exactly).
    <div className='flex flex-col lg:h-full lg:min-h-0 lg:flex-row lg:overflow-hidden'>
      <InstallSidebar commands={ORDERED_COMMANDS} />

      <main className='min-w-0 flex-1 px-6 py-12 lg:overflow-y-auto lg:px-12 lg:pt-8 lg:pb-10'>
        <div className='mx-auto flex max-w-3xl flex-col gap-10 lg:max-w-4xl'>
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
                // `scroll-mt-6` offsets the anchor target so a click/scroll-spy
                // jump lands the heading just below the pane's top edge, not flush.
                <div key={command.name} id={commandSlug(command.name)} className='flex scroll-mt-6 flex-col gap-3'>
                  <div className='flex flex-wrap items-center gap-3'>
                    <Heading level={3} className='font-serif'>
                      {command.name}
                    </Heading>
                    {command.status === 'planned' && <Badge variant='outline'>Coming soon</Badge>}
                  </div>

                  <CommandBlock command={synopsis} />

                  <Text className='font-sans'>{command.description}</Text>

                  {command.details?.map((paragraph) => (
                    <DetailText key={paragraph} text={paragraph} />
                  ))}

                  {command.flags && command.flags.length > 0 && (
                    <div className='flex flex-col gap-1'>
                      <Text weight='bold' className='font-sans'>
                        Options
                      </Text>
                      <div className='flex flex-col gap-1 pl-4'>
                        {command.flags.map((flag) => (
                          <div key={flag.flag} className='flex flex-wrap items-baseline gap-2'>
                            <Code>{flag.flag}</Code>
                            <Text as='span' size='sm' className='font-sans' muted>
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
        </div>
      </main>
    </div>
  )
}
