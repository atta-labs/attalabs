import { Separator } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { renderProse } from './prose'

export type StageQA = {
  tool: string
  say: string
  result: string
  studio: string
}

export type StagePageProps = {
  title: string
  intro: string[]
  qa: StageQA
  docsHref: string
  docsLabel: string
  /** Content specific to one stage that doesn't fit the four-question shape
   * — used once, on `/start/develop`, for the retained `vinaya check --all`
   * transcripts. Optional so every other stage page stays four questions and
   * nothing else. */
  extra?: ReactNode
}

const QUESTIONS: { key: keyof StageQA; label: string }[] = [
  { key: 'tool', label: 'What kind of tool' },
  { key: 'say', label: 'What you say to it' },
  { key: 'result', label: 'What comes out' },
  { key: 'studio', label: 'What to look at in Studio' }
]

/** One shared shape for every "Ship with Vinaya" stage page — the same four
 * questions, in the same order, every time, so the section reads as one
 * narrative rather than eight differently-organized pages. This is
 * deliberately NOT `DocPage`: `/docs` renders the model's own binding text;
 * this renders what the reader does, and links into `/docs` rather than
 * repeating it (Issue #682's one-directional rule). */
export function StagePage({ title, intro, qa, docsHref, docsLabel, extra }: StagePageProps) {
  return (
    <article className='flex flex-col gap-6 pt-4'>
      <header className='flex flex-col gap-3'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          Ship with Vinaya
        </Text>
        <Heading level={1} className='font-serif font-light tracking-normal leading-tight text-foreground'>
          {title}
        </Heading>
        {intro.map((paragraph) => (
          <Text key={paragraph} as='p' size='lg' muted className='leading-relaxed'>
            {renderProse(paragraph)}
          </Text>
        ))}
      </header>

      <Separator className='opacity-60' />

      <dl className='flex flex-col gap-5'>
        {QUESTIONS.map(({ key, label }) => (
          <div key={key} className='flex flex-col gap-1.5'>
            <dt className='font-sans text-xs font-bold uppercase tracking-widest text-muted-foreground'>{label}</dt>
            <dd className='font-sans text-base leading-relaxed text-foreground'>{renderProse(qa[key])}</dd>
          </div>
        ))}
      </dl>

      {extra}

      <Separator className='opacity-60' />

      <NextLink
        href={docsHref}
        variant='unstyled'
        className='inline-flex w-fit items-center gap-1.5 text-primary text-sm underline-offset-4 hover:underline'
      >
        <span>Read the {docsLabel} role</span>
        <ArrowRight className='size-3.5' />
      </NextLink>
    </article>
  )
}
