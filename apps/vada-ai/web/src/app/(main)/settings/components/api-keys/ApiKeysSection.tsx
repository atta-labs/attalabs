import { Text } from '@atta/ui/shared'
import { PROVIDERS, ROUTE_PROVIDER_ORDER } from '@atta/models'
import { ApiKeyRow } from './ApiKeyRow'

interface ApiKeysSectionProps {
  apiKeys: Array<{ provider: string; keyHint: string }>
  onKeyAdded: (provider: string, keyHint: string) => void
  onKeyRemoved: (provider: string) => void
}

export function ApiKeysSection({ apiKeys, onKeyAdded, onKeyRemoved }: ApiKeysSectionProps) {
  const keyMap = Object.fromEntries(apiKeys.map((k) => [k.provider, k.keyHint]))

  return (
    <div className='space-y-4'>
      <div className='space-y-1'>
        <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-foreground/50'>
          API Keys
        </Text>
        <Text as='p' size='sm' muted>
          Add your own API keys. Models are only available for providers with a configured key.
        </Text>
      </div>

      <div>
        {ROUTE_PROVIDER_ORDER.map((id) => (
          <ApiKeyRow
            key={id}
            provider={PROVIDERS[id]}
            keyHint={keyMap[id] ?? null}
            onSaved={onKeyAdded}
            onRemoved={onKeyRemoved}
          />
        ))}
      </div>
    </div>
  )
}
