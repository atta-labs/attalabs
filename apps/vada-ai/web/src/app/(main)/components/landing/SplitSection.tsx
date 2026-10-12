import { cn } from '@atta/ui/lib/utils'
import type { ReactNode, Ref } from 'react'
import { SectionSubtitle, SectionTitle } from './SectionHeading'
import { WipeReveal } from './WipeReveal'

// The landing's two-column section, after Vinaya's ConfigBoard/Ownership sections: copy on one
// side, an animation on the other, and `reverse` swaps the sides so consecutive sections alternate.
// The copy is always the same type scale (the compact sans title, the shared subtitle) and always
// animated: each title line wipes in, then each subtitle line after it. Stacks below `lg`, copy
// first and centred.
const LINE_DELAYS = ['', 'delay-[700ms]', 'delay-[1100ms]', 'delay-[1400ms]', 'delay-[1700ms]'] as const

export function SplitSection({
  id,
  ref,
  background,
  reverse = false,
  title,
  subtitle,
  children,
  visual,
  visualClassName,
  runway,
  fill = true
}: {
  id?: string
  ref?: Ref<HTMLElement>
  /** Full `bg-* text-*` token pair; consecutive sections must not share one. */
  background: string
  reverse?: boolean
  /** One entry per line; every line after the first renders muted. */
  title: readonly string[]
  /** One entry per line, wiping in after the title. */
  subtitle: readonly ReactNode[]
  /** Anything under the subtitle (links, buttons). */
  children?: ReactNode
  visual: ReactNode
  visualClassName?: string
  /** A pinned section's scroll runway (e.g. `h-[300vh]`): the content then sticks for its length. */
  runway?: string
  /** One screen tall (default). Off for the last section, so it and the footer fit one screen and
   * its title never ends up under the header at the bottom of the page. */
  fill?: boolean
}) {
  return (
    <section id={id} ref={ref} className={cn('relative', background, runway)}>
      <div
        className={cn(
          runway ? 'sticky top-0 h-screen' : fill && 'min-h-screen',
          'mx-auto flex max-w-[73.75rem] flex-col items-center justify-center gap-12 px-6 py-20 sm:px-10 lg:gap-16',
          reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'
        )}
      >
        <div className='flex w-full min-w-0 flex-col items-center gap-6 text-center lg:flex-[1_1_0] lg:items-start lg:text-left'>
          <SectionTitle size='compact' wipe={false}>
            {title.map((line, index) => (
              <WipeReveal key={line} delayClass={LINE_DELAYS[index]}>
                {index === 0 ? line : <span className='text-muted-foreground'>{line}</span>}
              </WipeReveal>
            ))}
          </SectionTitle>
          <SectionSubtitle className='flex flex-col gap-1'>
            {subtitle.map((line, index) => (
              <WipeReveal key={index} delayClass={LINE_DELAYS[Math.min(title.length + index, LINE_DELAYS.length - 1)]}>
                {line}
              </WipeReveal>
            ))}
          </SectionSubtitle>
          {children}
        </div>
        <div className={cn('w-full min-w-0 lg:flex-[1.15_1_0]', visualClassName)}>{visual}</div>
      </div>
    </section>
  )
}
