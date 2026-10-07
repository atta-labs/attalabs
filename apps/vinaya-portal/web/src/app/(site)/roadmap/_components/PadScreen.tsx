'use client'

import { useEffect, useRef } from 'react'
import { attach, finishSuccess, getPhase, subscribe } from '../_lib/rest-signal'

// The sign above the launch pad's towers, with a terminal screen inside it (the SVG
// sign, posts and conduit live in `DeploymentTrack`'s pad SVG; this is the live panel).
// The root is the SAME box as that SVG (viewBox `0 -58 200 182`: 12.5rem x 11.375rem,
// same anchor, same `origin-bottom` mobile scale), and the panel sits in the sign at the
// design's fractions: left 12.5%, top 3.846%, width 75%, height 20.879%. It is a size
// container and everything inside is in cqw, so the text scales with the pad. Theme
// tokens only: a light sign in light mode, a dark one in dark mode.
//
// Behaviour (the design's `makeTyper`): the prompt types at 28 cps, 450ms pause, then a
// message at 16 cps with 0-24ms jitter per key, a 2.4s hold, backspace at 45 cps, a 300ms
// gap, the next message (it opens on the first, then shuffles without repeats). Past
// 70px of scroll the message clears, a success line types at 40 cps in `success`, holds
// 1.5s, the cursor goes off and the sign keeps that line while the cue and idle motion
// fade (`_lib/rest-signal.ts`). Back at the top it restarts at the prompt. One timer
// chain, cleaned up on unmount. Reduced motion: static prompt and first message, no
// cursor, no typing, success skipped. Decorative, so `aria-hidden`.
const SETS = {
  desk: {
    prompt: '$ ./launch.sh',
    msgs: ['Scroll to ship', 'git push sky', 'LGTM. Scroll.', 'scroll --force', 'works locally', 'sudo ignite'],
    ok: ['✓ checks green', '✓ ignition', '✓ shipped']
  }
}

export function PadScreen() {
  const rootRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLSpanElement>(null)
  const msgRef = useRef<HTMLSpanElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const p = promptRef.current
    const m = msgRef.current
    const c = cursorRef.current
    if (!root || !p || !m || !c) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // The pad is full size on every width now, so the 9.4rem panel fits the desktop copy
    // (every line <= 14 characters at 9cqw) on narrow screens too.
    const set = SETS.desk

    let timer = 0
    let order: string[] = []
    let seen = false
    let okIdx = 0

    const later = (fn: () => void, ms: number) => {
      timer = window.setTimeout(fn, ms)
    }
    const clear = () => window.clearTimeout(timer)
    // A key landing restarts the cursor's blink, so it stays solid while typing.
    const keyLanded = () => {
      for (const a of c.getAnimations()) a.currentTime = 0
    }
    const type = (el: HTMLElement, str: string, cps: number, jitter: number, done: () => void) => {
      let i = 0
      const step = () => {
        i += 1
        el.textContent = str.slice(0, i)
        keyLanded()
        if (i < str.length) later(step, 1000 / cps + Math.random() * jitter)
        else done()
      }
      step()
    }
    const erase = (el: HTMLElement, cps: number, done: () => void) => {
      const step = () => {
        el.textContent = (el.textContent ?? '').slice(0, -1)
        keyLanded()
        if (el.textContent) later(step, 1000 / cps)
        else done()
      }
      step()
    }
    const next = () => {
      if (order.length === 0) {
        const rest = set.msgs.slice(1).sort(() => Math.random() - 0.5)
        const first = set.msgs[0] ?? ''
        order = seen ? rest.concat(first).sort(() => Math.random() - 0.5) : [first, ...rest]
        seen = true
      }
      const msg = order.shift() ?? ''
      m.dataset.ok = 'false'
      type(m, msg, 16, 24, () => later(() => erase(m, 45, () => later(next, 300)), 2400))
    }
    const staticLine = (text: string, ok: boolean) => {
      p.textContent = set.prompt
      m.textContent = text
      m.dataset.ok = ok ? 'true' : 'false'
      c.dataset.off = 'true'
    }
    const restart = () => {
      clear()
      if (reduce) {
        staticLine(set.msgs[0] ?? '', false)
        return
      }
      order = []
      p.textContent = ''
      m.textContent = ''
      m.dataset.ok = 'false'
      c.dataset.off = 'false'
      type(p, set.prompt, 28, 10, () => later(next, 450))
    }
    const success = () => {
      clear()
      if (reduce) {
        finishSuccess()
        return
      }
      m.textContent = ''
      m.dataset.ok = 'true'
      const line = set.ok[okIdx % set.ok.length] ?? ''
      okIdx += 1
      type(m, line, 40, 0, () =>
        later(() => {
          c.dataset.off = 'true'
          finishSuccess()
        }, 1500)
      )
    }

    const detach = attach(root)
    let prev = getPhase()
    if (prev === 'idle') restart()
    else staticLine(set.ok[0] ?? '', true) // arrived already scrolled: the settled sign

    const unsubscribe = subscribe((e) => {
      if (e.phase === prev) return
      const before = prev
      prev = e.phase
      if (before === 'idle' && e.phase === 'success') success()
      else if (e.phase === 'idle') restart()
    })

    return () => {
      clear()
      unsubscribe()
      detach()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden
      className='pointer-events-none absolute top-[-11.375rem] left-[-6.25rem] h-[11.375rem] w-[12.5rem] origin-bottom'
    >
      <div className='absolute top-[3.846%] left-[12.5%] h-[20.879%] w-[75%] [container-type:size]'>
        <div className='box-border flex size-full flex-col justify-between overflow-hidden whitespace-nowrap rounded-[1.5cqw] bg-[color-mix(in_oklch,var(--foreground)_5%,var(--card))] px-[4.5cqw] py-[3.5cqw] font-mono leading-none shadow-[inset_0_0_0_1px_var(--border)]'>
          <span ref={promptRef} className='block min-h-[1em] text-[5.5cqw] text-muted-foreground' />
          <span className='flex items-center gap-[0.12em] text-[9cqw] text-foreground'>
            <span ref={msgRef} data-ok='false' className='block min-h-[1em] data-[ok=true]:text-success' />
            <span
              ref={cursorRef}
              data-off='false'
              className='vin-cursor inline-block h-[1em] w-[0.55em] bg-foreground data-[off=true]:hidden motion-reduce:hidden'
            />
          </span>
        </div>
      </div>
    </div>
  )
}
