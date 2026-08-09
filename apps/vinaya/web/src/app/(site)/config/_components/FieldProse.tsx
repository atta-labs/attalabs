import { Code } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'

// Same deliberately-dumb backtick splitter as `/docs/cli`'s `DetailText` — kept as
// a local copy rather than a cross-route import, since `_components` folders
// are route-private by convention. Split on backticks, odd-indexed runs
// render as inline `Code`.
export function FieldProse({ text }: { text: string }) {
  const parts = text.split('`')
  return (
    <Text as='p' className='font-sans text-sm text-muted-foreground'>
      {parts.map((part, index) => (index % 2 === 1 ? <Code key={`${index}-${part}`}>{part}</Code> : part))}
    </Text>
  )
}
