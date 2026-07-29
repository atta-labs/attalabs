import { COMMANDS } from '@atta/vinaya-sources'
import { Badge, Code } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { CommandBlock } from './_components/CommandBlock'
import { DetailText } from './_components/DetailText'
import { commandSlug } from './_components/command-slug'

export default function CliPage() {
  return (
    <div className='flex flex-col gap-10'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif'>
          Vinaya CLI
        </Heading>
        <Text className='font-sans' muted>
          Vinaya&rsquo;s command reference.
        </Text>
      </section>

      <section className='flex flex-col gap-8'>
        {COMMANDS.map((command) => {
          const synopsis =
            command.name === 'init' ? `npx @attalabs/vinaya ${command.name}` : `vinaya ${command.name}`
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
  )
}
