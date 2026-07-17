import { Code } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'

// A deliberately dumb splitter, not a markdown renderer: split on backticks,
// odd-indexed runs are inline code. It handles exactly the one construct the
// registry's `details` use. If a paragraph ever needs more than this, the
// answer is to keep the prose simpler, not to grow a parser here.
//
// It also retires the missing-`{' '}`-after-inline-code bug by construction:
// the spacing lives inside the registry's own strings, so a split can never
// drop it the way hand-written JSX repeatedly did.
export function DetailText({ text }: { text: string }) {
  const parts = text.split('`')
  return (
    <Text className='font-sans'>
      {parts.map((part, index) => (index % 2 === 1 ? <Code key={`${index}-${part}`}>{part}</Code> : part))}
    </Text>
  )
}
