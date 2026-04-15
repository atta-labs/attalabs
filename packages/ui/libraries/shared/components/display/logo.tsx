import { cn } from '../../../../lib/utils'

export interface LogoProps {
  light?: string
  dark?: string
  alt?: string
  /** Tailwind height class, e.g. "h-6", "h-8". Defaults to "h-6". */
  size?: string
  className?: string
}

export function Logo({ light, dark, alt = '', size = 'h-6', className }: LogoProps) {
  if (!light && !dark) return null
  return (
    <>
      {light && <img src={light} alt={alt} className={cn(size, 'w-auto', dark ? 'dark:hidden' : '', className)} />}
      {dark && <img src={dark} alt={alt} className={cn(size, 'w-auto', 'hidden dark:block', className)} />}
    </>
  )
}
