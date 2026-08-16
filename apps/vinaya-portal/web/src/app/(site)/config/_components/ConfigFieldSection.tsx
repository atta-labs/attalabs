import type { ConfigField } from '@attalabs/vinaya-sources'
import { Badge, CodeBlock } from '@atta/ui/components'
import { Heading } from '@atta/ui/shared'
import { FieldProse } from './FieldProse'

/**
 * One `CONFIG_REFERENCE` row — key/type/prose/example, plus the secrets
 * warning callout for the one field that carries one (`checks.env.literal`).
 * `depth` (the number of `.` segments in `field.key`) sizes the heading so a
 * nested field (`rings.ring1_forgeWriteInterception`, `checks.env.anyOf`)
 * reads as a child of its parent row rather than a sibling section.
 */
export function ConfigFieldSection({ field }: { field: ConfigField }) {
  const depth = field.key.split('.').length
  const headingLevel = depth >= 3 ? 4 : depth === 2 ? 3 : 2

  return (
    <div id={`config-${field.key.replace(/\./g, '-')}`} className='flex scroll-mt-6 flex-col gap-3'>
      <div className='flex flex-wrap items-center gap-3'>
        <Heading level={headingLevel} className='font-serif'>
          {field.key}
        </Heading>
        <Badge variant='outline' className='font-mono text-xs font-normal'>
          {field.type}
        </Badge>
      </div>

      {field.semantics.map((sentence, index) => (
        <FieldProse key={`${field.key}-${index}`} text={sentence} />
      ))}

      <CodeBlock className='my-0'>{field.example}</CodeBlock>

      {field.warning && (
        <div className='rounded-md border border-warning/40 px-4 py-3'>
          <FieldProse text={field.warning} />
        </div>
      )}
    </div>
  )
}
