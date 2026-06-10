import { Heading, Text } from '@atta/ui/components'
import { ProviderIcon } from '@lobehub/icons'

const PROVIDERS = ['anthropic', 'google', 'openai', 'meta', 'mistral', 'deepseek', 'qwen', 'xai'] as const

export function BYOKCallout() {
  return (
    <div className='flex flex-col items-center gap-5 rounded-md border border-border px-6 py-10 bg-background/80'>
      <Heading level={3} className='font-serif text-2xl text-foreground'>
        Choose your models.
      </Heading>
      <Text as='p' className='max-w-lg text-center text-sm text-muted-foreground'>
        Frontier, open, or mixed. Claude as your Critic, Llama as your Strategist. The room doesn&rsquo;t care.
      </Text>
      <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-2 opacity-60'>
        {PROVIDERS.map((provider) => (
          <ProviderIcon key={provider} provider={provider} size={28} />
        ))}
      </div>
    </div>
  )
}
