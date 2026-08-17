'use client'

export function TaskTitleCell({ title }: { title: string }) {
  return <span className='line-clamp-5 font-sans text-sm text-card-foreground'>{title}</span>
}
