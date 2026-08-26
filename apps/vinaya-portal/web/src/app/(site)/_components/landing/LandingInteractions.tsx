'use client'

import { Button, Card } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowDown, ArrowUpRight, Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

export function RevealGrid({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const target = scrollParent(element)
    let animationFrame = 0

    const evaluate = () => {
      animationFrame = 0
      const bounds = element.getBoundingClientRect()
      if (bounds.top < window.innerHeight * 0.85 && bounds.bottom > 0) setVisible(true)
      else if (bounds.top >= window.innerHeight * 0.85) setVisible(false)
    }
    const queue = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(evaluate)
    }
    const observer = new IntersectionObserver(queue, {
      root: target instanceof Window ? null : target,
      threshold: [0, 0.05]
    })
    observer.observe(element)
    target.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    const poll = window.setInterval(queue, 250)
    evaluate()
    return () => {
      observer.disconnect()
      target.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      window.clearInterval(poll)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <div ref={ref} data-visible={visible} className={`group/reveal ${className}`}>
      {children}
    </div>
  )
}

export function ScrollToSectionButton({ targetId, children }: { targetId: string; children: ReactNode }) {
  return (
    <Button
      type='button'
      size='lg'
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
      className='font-mono text-xs uppercase tracking-[0.16em]'
    >
      {children}
      <ArrowDown className='size-4' />
    </Button>
  )
}

export function CommandCopy({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Button
      type='button'
      variant='outline'
      onClick={copy}
      className='h-auto gap-4 rounded-lg py-2.5 pl-5 pr-3 font-mono text-sm shadow-none sm:text-base'
    >
      <span className='whitespace-nowrap'>{command}</span>
      <span className='flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground'>
        {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
        {copied ? 'copied' : 'copy'}
      </span>
    </Button>
  )
}

export function CommandLinkChip({ href, label, command }: { href: string; label: string; command: string }) {
  return (
    <NextLink
      href={href}
      variant='unstyled'
      className='group flex w-full flex-col items-center gap-2.5 text-center sm:w-auto sm:items-start sm:text-left'
    >
      <span className='font-mono text-sm uppercase tracking-[0.18em] text-muted-foreground'>{label}</span>
      <Card className='px-7 py-5 transition-colors group-hover:border-foreground'>
        <span className='flex items-center gap-3 font-mono text-xl whitespace-nowrap sm:text-2xl'>
          {command}
          <ArrowUpRight className='size-7 shrink-0 text-muted-foreground' />
        </span>
      </Card>
    </NextLink>
  )
}

export function EnforcementRatio({ value }: { value: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let animationFrame = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        const startedAt = performance.now()
        const tick = (now: number) => {
          const progress = Math.min(1, (now - startedAt) / 1500)
          const eased = 1 - (1 - progress) ** 4
          setDisplay(Math.round(value * eased))
          if (progress < 1) animationFrame = requestAnimationFrame(tick)
        }
        setDisplay(0)
        animationFrame = requestAnimationFrame(tick)
      },
      { threshold: 0.35 }
    )

    observer.observe(element)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(animationFrame)
    }
  }, [value])

  return (
    <div
      ref={ref}
      className='mt-12 font-serif text-8xl leading-none tracking-tighter tabular-nums sm:text-9xl lg:text-[9.375rem]'
    >
      {display}%
    </div>
  )
}

export function RingProgress({ delayed = false }: { delayed?: boolean }) {
  const [filled, setFilled] = useState(true)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const duration = delayed ? 4300 : 2600
    const startDelay = delayed ? 1100 : 0
    let resetTimer = 0
    let fillTimer = 0
    let cycleTimer = 0

    const cycle = () => {
      setFilled(false)
      fillTimer = window.setTimeout(() => setFilled(true), 40 + startDelay)
      resetTimer = window.setTimeout(cycle, duration + startDelay)
    }

    cycleTimer = window.setTimeout(cycle, 20)
    return () => {
      window.clearTimeout(resetTimer)
      window.clearTimeout(fillTimer)
      window.clearTimeout(cycleTimer)
    }
  }, [delayed])

  return (
    <div className='mt-6 h-0.5 overflow-hidden rounded-full bg-current/20'>
      <div
        className={`h-full origin-left bg-current motion-reduce:scale-x-100 ${
          filled
            ? delayed
              ? 'scale-x-100 transition-transform duration-[3200ms] ease-in-out'
              : 'scale-x-100 transition-transform duration-[2200ms] ease-in-out'
            : 'scale-x-0 duration-0'
        } ${delayed ? 'opacity-60' : ''}`}
      />
    </div>
  )
}
