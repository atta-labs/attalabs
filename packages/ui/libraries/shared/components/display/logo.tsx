import { cn } from '../../../../lib/utils'

export interface LogoProps {
  light?: string
  dark?: string
  alt?: string
  /** Tailwind height class, e.g. "h-6", "h-8". Defaults to "h-6". */
  size?: string
  className?: string
  /** Optional text labels to display next to logo. 1-2 strings. */
  text?: string[]
}

export function Logo({ light, dark, alt = '', size = 'h-6', className, text }: LogoProps) {
  const url = light ?? dark
  if (!url) return null

  const hasText = text && text.length > 0

  const logoPart = (
    // biome-ignore lint/performance/noImgElement: shared agnostic library can't use next/image
    <img src={url} alt={alt} className={cn(size, 'w-auto dark:invert', className)} />
  )

  if (!hasText) return logoPart

  const textPart =
    text.length === 1 ? (
      <div className={cn(size, 'flex items-center')}>{text[0]}</div>
    ) : (
      <div className='flex flex-col'>
        <span className='text-sm uppercase font-mono'>{text[0]}</span>
        <span className='text-sm uppercase font-mono text-accent'>{text[1]}</span>
      </div>
    )

  return (
    <div className='flex items-center gap-1 font-bold'>
      {logoPart}
      {textPart}
    </div>
  )
}
