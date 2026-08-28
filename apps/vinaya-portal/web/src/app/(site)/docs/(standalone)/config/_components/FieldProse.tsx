import { Code } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'

// Route-private companion to the CLI detail renderer: inline code stays
// semantic while config prose remains authored in the shared registry.
export function FieldProse({ text }: { text: string }) {
  const parts = text.split('`')
  return (
    <Text as='p' className='font-sans text-sm text-muted-foreground'>
      {parts.map((part, index) => (index % 2 === 1 ? <Code key={`${index}-${part}`}>{part}</Code> : part))}
    </Text>
  )
}
