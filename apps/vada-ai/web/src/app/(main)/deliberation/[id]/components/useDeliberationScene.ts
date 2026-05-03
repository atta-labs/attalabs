'use client'

// All effects + derived state for the DeliberationFeed scene.
// Returns a flat object the component reads — no hooks inside the JSX.

import { useToastContext } from '@atta/ui'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useDeliberation } from './useDeliberation'

interface UseDeliberationSceneProps {
  sessionId: string
  question: string
  agentRoles: string[]
  initialEntries: Array<{ agent: string; content: string; round: number }>
  initialConclusion: Record<string, unknown> | null
  initialState: string
  initialTerminalState: string | null
  defaultProvider: string | null
  teamName?: string
  specId?: string
}

export function useDeliberationScene({
  sessionId,
  question,
  agentRoles,
  initialEntries,
  initialConclusion,
  initialState,
  initialTerminalState,
  defaultProvider,
  teamName = 'Deliberation',
  specId
}: UseDeliberationSceneProps) {
  const { messages, streamingMessage, loadingMessage, streamError, currentState, terminalState, conclusion } =
    useDeliberation(
      sessionId,
      question,
      initialEntries,
      initialConclusion,
      initialState,
      initialTerminalState,
      defaultProvider,
      specId
    )

  const isLiveSession = currentState !== 'TERMINAL'
  const showConclusion = !!terminalState
  const showLoading = ['PENDING', 'CONCLUDING', 'AUDITING', 'REVISING'].includes(currentState) && !!loadingMessage

  const rounds = useMemo(
    () =>
      Array.from(new Set(messages.map((m) => m.round)))
        .filter((r) => messages.some((m) => m.round === r && m.content.trim().length > 0))
        .sort((a, b) => a - b),
    [messages]
  )

  const currentRoundNum = currentState.startsWith('ROUND_')
    ? Number.parseInt(currentState.replace('ROUND_', ''), 10)
    : null

  // Display set = completed rounds ∪ currently-streaming round. Makes an
  // empty RoundStrip appear as soon as the engine starts a new round, even
  // before any content streams back.
  const displayRounds = useMemo(() => {
    const set = new Set<number>(rounds)
    if (currentRoundNum) set.add(currentRoundNum)
    return Array.from(set).sort((a, b) => a - b)
  }, [rounds, currentRoundNum])

  // A round is "complete" if the engine has moved past it — either to a later
  // round, into the conclusion protocol, or to TERMINAL. Derived from
  // currentState rather than tracked separately so there's one source of truth.
  const isRoundComplete = useCallback(
    (round: number): boolean => {
      if (currentState === 'TERMINAL') return true
      if (['CONCLUDING', 'AUDITING', 'REVISING'].includes(currentState)) return true
      if (currentRoundNum === null) return false
      return round < currentRoundNum
    },
    [currentState, currentRoundNum]
  )

  const isInterrupted = !isLiveSession && !showConclusion && initialState !== 'PENDING' && initialState !== 'TERMINAL'
  const isTerminalButEmpty =
    initialState === 'TERMINAL' &&
    !initialConclusion &&
    terminalState === 'UNCONVERGED' &&
    initialEntries.length > 0 &&
    initialEntries.length < agentRoles.length * 3

  const interruptedRoundLabel = initialState?.replace('_', ' ').toLowerCase() ?? 'unknown state'

  // ── Auto-scroll (sticky-bottom pattern) ──
  // Follow the stream only when the user is near the bottom. A ref tracks
  // scroll position so rapid token updates don't yank the user back.
  const feedEndRef = useRef<HTMLDivElement>(null)
  const wasAtBottomRef = useRef(true)

  useEffect(() => {
    const THRESHOLD = 150
    const handle = () => {
      const distanceFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight
      wasAtBottomRef.current = distanceFromBottom < THRESHOLD
    }
    handle()
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])

  // Stream tail: instant scroll, only if already at bottom.
  useEffect(() => {
    if (streamingMessage && wasAtBottomRef.current) {
      feedEndRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' })
    }
  }, [streamingMessage?.content])

  // New message appended: smooth scroll, only if already at bottom.
  const lastMessageCountRef = useRef(messages.length)
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length
      if (wasAtBottomRef.current) {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }
  }, [messages.length])

  // Conclusion arrives: unconditional scroll (it's the payoff).
  const scrolledToConclusionRef = useRef(false)
  useEffect(() => {
    if (showConclusion && !scrolledToConclusionRef.current) {
      scrolledToConclusionRef.current = true
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [showConclusion])

  // New round started: scroll that round's strip to the top of the viewport
  // so the user refocuses on the fresh round. The first round we see (mount
  // or initial run) is recorded but not scrolled — user is already at the
  // top, no yank needed. Subsequent transitions (round 1 → 2 → 3) scroll.
  const lastScrolledRoundRef = useRef<number | null>(null)
  useEffect(() => {
    if (!currentRoundNum) return
    if (lastScrolledRoundRef.current === null) {
      lastScrolledRoundRef.current = currentRoundNum
      return
    }
    if (currentRoundNum !== lastScrolledRoundRef.current) {
      lastScrolledRoundRef.current = currentRoundNum
      const el = document.querySelector(`[data-round="${currentRoundNum}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentRoundNum])

  // Stream errors → toast (not a sticky banner). Dedupe against last toasted.
  const { errorToast } = useToastContext()
  const lastToastedErrorRef = useRef<string | null>(null)
  useEffect(() => {
    if (streamError && streamError !== lastToastedErrorRef.current) {
      lastToastedErrorRef.current = streamError
      errorToast('Deliberation error', streamError, 8000)
    }
  }, [streamError, errorToast])

  return {
    messages,
    streamingMessage,
    loadingMessage,
    streamError,
    currentState,
    terminalState,
    conclusion,
    isLiveSession,
    showConclusion,
    showLoading,
    rounds,
    displayRounds,
    teamName,
    currentRoundNum,
    isRoundComplete,
    isInterrupted,
    isTerminalButEmpty,
    interruptedRoundLabel,
    feedEndRef
  }
}
