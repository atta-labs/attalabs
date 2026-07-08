'use client'

import { Button, Input, Textarea } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { type UIMessage, useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface OnboardingState {
  username?: string
  usernameValid?: boolean
  githubHandle?: string
  githubValid?: boolean
  githubAvatar?: string
  cvParsed?: boolean
  cvProfile?: { name: string; title: string; stack: string[]; projects: number; experience: number }
  waitingForCv?: boolean
  complete?: boolean
  completionError?: string
}

interface ToolPart {
  type: string
  toolCallId: string
  state?: string // undefined during SDK streaming transitions
  input?: unknown
  output?: unknown
}

function getToolParts(msg: UIMessage): ToolPart[] {
  if (!msg?.parts) return []
  return msg.parts
    .filter((p): p is NonNullable<typeof p> => p != null && (p.type === 'dynamic-tool' || p.type.startsWith('tool-')))
    .map((p) => p as unknown as ToolPart)
}

function getToolName(part: ToolPart): string {
  if (part.type.startsWith('tool-')) return part.type.slice(5)
  return part.type
}

function getMessageText(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

// Ids of user messages that are real answers, in order — position 0 is
// always the username, position 1 the GitHub handle. Excludes the
// auto-sent "Start onboarding" bootstrap message: it's role 'user' too
// (so a naive filter counts it), but it's never rendered and isn't an
// answer, so counting it shifted every real step's index by one.
function getVisibleUserMessageIds(messages: UIMessage[]): string[] {
  return messages.filter((m) => m.role === 'user' && getMessageText(m) !== 'Start onboarding').map((m) => m.id)
}

export function AIOnboarding() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<OnboardingState>({})
  const [uploading, setUploading] = useState(false)
  const [cvPasteMode, setCvPasteMode] = useState(false)
  const [cvPasteText, setCvPasteText] = useState('')
  const [started, setStarted] = useState(false)
  const [hasUserSent, setHasUserSent] = useState(false)
  const [input, setInput] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  // Holds the model's complete_onboarding args once it asks to finish, but
  // doesn't act on them until the user explicitly confirms (see the "Create
  // My Herald" button) — completion used to fire the instant the CV finished
  // parsing, giving no window to notice and fix a wrong upload before the
  // profile was created and the redirect fired.
  const [pendingCompletion, setPendingCompletion] = useState<{
    username: string
    githubHandle?: string
    toolCallId: string
  } | null>(null)
  const handledToolCalls = useRef(new Set<string>())

  const { messages, sendMessage, addToolOutput, status, regenerate, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/admin/onboarding-chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (e) => console.error('[AIOnboarding SDK error — root cause]', e)
  })

  useEffect(() => {
    if (!started && messages.length === 0) {
      setStarted(true)
      sendMessage({ text: 'Start onboarding' })
    }
  }, [started, messages.length, sendMessage])

  const handleComplete = useCallback(
    async (username: string, githubHandle: string | undefined, toolCallId: string) => {
      setState((s) => ({ ...s, complete: true, completionError: undefined }))

      try {
        const cvData = (window as any).__heraldCvData
        // Prefer state.username/githubHandle over the tool call's own args — a
        // direct edit (see submitEditedMessage) updates state without the model
        // ever seeing it, so state is the freshest value once it's been set.
        const finalUsername = state.username ?? username
        const res = await fetch('/api/admin/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: finalUsername,
            githubHandle: state.githubHandle ?? githubHandle ?? undefined,
            name: cvData?.name ?? state.cvProfile?.name ?? 'Unknown',
            title: cvData?.title ?? state.cvProfile?.title ?? 'Professional',
            summary: cvData?.summary ?? '',
            stack: cvData?.stack ?? state.cvProfile?.stack ?? [],
            projects: cvData?.projects ?? [],
            experience: cvData?.experience ?? [],
            cvUrl: cvData?.cvUrl ?? null
          })
        })

        addToolOutput({ tool: 'complete_onboarding', toolCallId, output: { success: res.ok } })

        if (res.ok) {
          // Land on the public profile that was just generated — not
          // Bulk Audit, which needs a BYOK key the user hasn't set up yet
          // and shows nothing they just created.
          setTimeout(() => {
            router.push(`/${finalUsername}`)
            router.refresh()
          }, 1500)
          return
        }

        const body = await res.json().catch(() => null)
        const message =
          (body && typeof body.error === 'string' && body.error) || 'Could not finish setting up your profile.'
        setState((s) => ({ ...s, complete: false, completionError: message }))
        addToolOutput({ tool: 'complete_onboarding', toolCallId, state: 'output-error', errorText: message })
      } catch {
        setState((s) => ({ ...s, complete: false, completionError: 'Could not reach the server. Please try again.' }))
        addToolOutput({ tool: 'complete_onboarding', toolCallId, state: 'output-error', errorText: 'Failed' })
      }
    },
    [state.username, state.cvProfile, state.githubHandle, router, addToolOutput]
  )

  useEffect(() => {
    for (const msg of messages) {
      for (const tp of getToolParts(msg)) {
        if (!tp) continue
        const name = getToolName(tp)

        if (tp.output && !handledToolCalls.current.has(`result-${tp.toolCallId}`)) {
          handledToolCalls.current.add(`result-${tp.toolCallId}`)

          if (name === 'check_username') {
            const r = tp.output as { available: boolean; username: string }
            setState((s) => ({ ...s, username: r.username, usernameValid: r.available }))
          }
          if (name === 'verify_github') {
            const r = tp.output as { valid: boolean; handle: string; avatarUrl?: string }
            setState((s) => ({ ...s, githubHandle: r.handle, githubValid: r.valid, githubAvatar: r.avatarUrl }))
          }
        }

        if (tp.state != null && tp.state === 'input-available' && !handledToolCalls.current.has(tp.toolCallId)) {
          handledToolCalls.current.add(tp.toolCallId)

          if (name === 'request_cv_upload') {
            setState((s) => ({ ...s, waitingForCv: true }) as OnboardingState)
          }
          if (name === 'complete_onboarding' && tp.input != null) {
            const args = tp.input as { username: string; githubHandle?: string }
            if (args.username) {
              setPendingCompletion({
                username: args.username,
                githubHandle: args.githubHandle,
                toolCallId: tp.toolCallId
              })
            }
          }
        }
      }
    }
  }, [messages])

  // Fallback for a real, observed failure mode: the model is instructed to say
  // "drop your CV" AND call `request_cv_upload` in the same turn, but a fast
  // model doesn't always reliably chain a same-turn, empty-argument tool call
  // after conversational text. When that tool call never arrives, the UI was
  // stuck showing the generic text input under a message asking for a file.
  // This detects the same intent from the assistant's own wording as a
  // second, independent signal — not a replacement for the tool call, a safety net.
  useEffect(() => {
    if (state.waitingForCv || state.cvParsed || state.complete) return
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant') return
    const text = last.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
      .toLowerCase()
    if (text.includes('cv') || text.includes('résumé') || text.includes('resume')) {
      setState((s) => ({ ...s, waitingForCv: true }))
    }
  }, [messages, state.waitingForCv, state.cvParsed, state.complete])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('cv', file)

    let toolCallId = ''
    for (const msg of messages) {
      for (const tp of getToolParts(msg)) {
        if (!tp) continue
        if (getToolName(tp) === 'request_cv_upload') toolCallId = tp.toolCallId
      }
    }

    try {
      const res = await fetch('/api/admin/parse-cv', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Parse failed')
      const profile = await res.json()

      ;(window as any).__heraldCvData = { ...profile, cvUrl: profile.cvUrl ?? null }

      setState((s) => ({
        ...s,
        cvParsed: true,
        cvProfile: {
          name: profile.name,
          title: profile.title,
          stack: profile.stack ?? [],
          projects: profile.projects?.length ?? 0,
          experience: profile.experience?.length ?? 0
        }
      }))

      addToolOutput({
        tool: 'request_cv_upload',
        toolCallId,
        output: {
          success: true,
          name: profile.name,
          title: profile.title,
          skills: profile.stack?.length ?? 0,
          projects: profile.projects?.length ?? 0,
          experience: profile.experience?.length ?? 0
        }
      })
    } catch {
      addToolOutput({
        tool: 'request_cv_upload',
        toolCallId,
        state: 'output-error',
        errorText: 'Failed to parse CV'
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleCvPasteSubmit() {
    if (!cvPasteText.trim()) return

    setUploading(true)

    let toolCallId = ''
    for (const msg of messages) {
      for (const tp of getToolParts(msg)) {
        if (!tp) continue
        if (getToolName(tp) === 'request_cv_upload') toolCallId = tp.toolCallId
      }
    }

    try {
      const res = await fetch('/api/admin/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cvPasteText })
      })
      if (!res.ok) throw new Error('Parse failed')
      const profile = await res.json()

      ;(window as any).__heraldCvData = profile

      setState((s) => ({
        ...s,
        cvParsed: true,
        cvProfile: {
          name: profile.name,
          title: profile.title,
          stack: profile.stack ?? [],
          projects: profile.projects?.length ?? 0,
          experience: profile.experience?.length ?? 0
        }
      }))

      addToolOutput({
        tool: 'request_cv_upload',
        toolCallId,
        output: {
          success: true,
          name: profile.name,
          title: profile.title,
          skills: profile.stack?.length ?? 0,
          projects: profile.projects?.length ?? 0,
          experience: profile.experience?.length ?? 0
        }
      })
      setCvPasteMode(false)
      setCvPasteText('')
    } catch {
      addToolOutput({
        tool: 'request_cv_upload',
        toolCallId,
        state: 'output-error',
        errorText: 'Failed to parse CV text'
      })
    } finally {
      setUploading(false)
    }
  }

  // Undo an extracted CV and go back to the upload/paste choice — the only
  // way to redo a mis-uploaded file before this was to abandon onboarding
  // entirely and start over.
  function handleRemoveCv() {
    ;(window as any).__heraldCvData = undefined
    setState((s) => ({ ...s, cvParsed: false, cvProfile: undefined, waitingForCv: true }))
    setCvPasteMode(false)
    setCvPasteText('')
  }

  function handleSend() {
    if (!input.trim() || isThinking || state.complete) return
    if (!hasUserSent) setHasUserSent(true)
    sendMessage({ text: input })
    setInput('')
  }

  function startEditingMessage(messageId: string, currentText: string) {
    if (isThinking) return
    setEditingMessageId(messageId)
    setEditingText(currentText)
    setEditError(null)
  }

  function cancelEditingMessage() {
    setEditingMessageId(null)
    setEditingText('')
    setEditError(null)
  }

  // Editing username/GitHub never touches the chat with the model at all —
  // it validates directly against the same checks the tools use, patches
  // state + that one message's text in place, and leaves every later step
  // (GitHub, CV) exactly as it was. Truncating-and-resending through the LLM
  // (the first version of this) discarded all downstream progress on every
  // edit, even a one-letter fix — genuinely destructive for a linear form.
  async function submitEditedMessage() {
    if (!editingMessageId) return
    const text = editingText.trim()
    if (!text) return

    const stepIndex = getVisibleUserMessageIds(messages).indexOf(editingMessageId)
    if (stepIndex === -1) return

    setEditSaving(true)
    setEditError(null)

    try {
      if (stepIndex === 0) {
        const res = await fetch(`/api/admin/check-username?username=${encodeURIComponent(text)}`)
        const data = await res.json().catch(() => null)
        if (!data?.available) {
          setEditError(data?.reason ?? 'That username is taken.')
          return
        }
        setState((s) => ({ ...s, username: text, usernameValid: true }))
      } else if (stepIndex === 1) {
        if (text.toLowerCase() === 'skip') {
          setState((s) => ({ ...s, githubHandle: undefined, githubValid: undefined, githubAvatar: undefined }))
        } else {
          const res = await fetch(`https://api.github.com/users/${encodeURIComponent(text)}`)
          if (!res.ok) {
            setEditError("Couldn't find that GitHub handle.")
            return
          }
          const data = await res.json()
          setState((s) => ({ ...s, githubHandle: text, githubValid: true, githubAvatar: data.avatar_url }))
        }
      } else {
        // No deterministic re-validation path past step 1 — the edit
        // affordance itself is hidden for later messages, so this shouldn't
        // be reachable, but bail out safely rather than guess.
        return
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === editingMessageId ? { ...m, parts: [{ type: 'text', text }] } : m))
      )
      setEditingMessageId(null)
      setEditingText('')
    } finally {
      setEditSaving(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, state])

  const isThinking = status === 'streaming' || status === 'submitted'

  // Positional role of each user message (0 = username, 1 = GitHub handle) —
  // used to gate which answers have a deterministic edit/re-validation path.
  const userMessageIds = getVisibleUserMessageIds(messages)

  // Get the first agent message for the centered initial state
  const firstAgentMsg = messages.find((m) => {
    if (m.role !== 'assistant') return false
    const text = m.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
    return text.length > 0
  })

  const firstAgentText =
    firstAgentMsg?.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''

  // ── Initial centered state (before user sends first message) ──
  if (!hasUserSent) {
    return (
      <div className='flex h-[calc(100vh-57px)] flex-col items-center justify-center px-6'>
        <div className='w-full max-w-[560px]'>
          <Text as='p' className='mb-2 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>
            Herald
          </Text>
          {firstAgentText ? (
            <Text as='p' className='mb-8 text-lg leading-relaxed text-foreground/80'>
              {firstAgentText}
            </Text>
          ) : (
            <Text as='p' className='mb-8 animate-pulse text-lg text-muted-foreground'>
              ...
            </Text>
          )}

          <input ref={fileRef} type='file' accept='.pdf,.txt,.md' onChange={handleFileUpload} className='hidden' />

          <div className='flex gap-2'>
            <Input
              className='h-12 rounded-none border-border bg-card px-4 font-sans text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder='Your answer...'
              disabled={isThinking || !firstAgentText}
              autoFocus
            />
            <Button
              type='button'
              variant='outline'
              onClick={handleSend}
              disabled={isThinking || !input.trim()}
              className='h-12 shrink-0 rounded-none border-border px-5 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground hover:bg-transparent hover:text-foreground'
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Conversation state (after first user message) ──
  return (
    <div className='flex h-full flex-col'>
      {/* Messages area — scrollable. h-full (not min-h-screen) so this fills the
          (app) layout's bounded `<main overflow-hidden>` — min-h-screen fights
          that ancestor's fixed height and the overflow-y-auto child below never
          gets a real scroll box, silently clipping earlier messages off the top. */}
      <div className='flex-1 overflow-y-auto pb-24'>
        <div className='mx-auto max-w-[560px] px-6 pt-8'>
          <div className='flex flex-col gap-5'>
            {messages.map((m) => {
              const text = m.parts
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join('')
              if (!text || text === 'Start onboarding') return null

              if (m.role === 'user') {
                // Only the username (step 0) and GitHub (step 1) answers have
                // a deterministic re-validation path — see submitEditedMessage.
                const stepIndex = userMessageIds.indexOf(m.id)
                const isEditable = stepIndex === 0 || stepIndex === 1

                if (editingMessageId === m.id) {
                  return (
                    <div key={m.id} className='flex justify-end'>
                      <div className='flex w-full max-w-[75%] flex-col gap-2'>
                        <Input
                          autoFocus
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          disabled={editSaving}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              submitEditedMessage()
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              cancelEditingMessage()
                            }
                          }}
                          className='h-10 rounded-none border-border bg-card px-3 font-sans text-sm text-foreground focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0'
                        />
                        {editError && (
                          <Text as='p' className='text-right text-xs text-destructive'>
                            {editError}
                          </Text>
                        )}
                        <div className='flex justify-end gap-2'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={cancelEditingMessage}
                            disabled={editSaving}
                            className='h-7 rounded-none font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground'
                          >
                            Cancel
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={submitEditedMessage}
                            disabled={!editingText.trim() || editSaving}
                            className='h-7 rounded-none font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground'
                          >
                            {editSaving ? 'Checking…' : 'Save & revalidate'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={m.id} className='group flex items-center justify-end gap-2'>
                    {isEditable && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        aria-label='Edit this answer'
                        title='Edit this answer'
                        onClick={() => startEditingMessage(m.id, text)}
                        disabled={isThinking || state.complete}
                        className='shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0'
                      >
                        <Pencil className='h-3.5 w-3.5' />
                      </Button>
                    )}
                    <div className='max-w-[75%] border border-foreground/10 bg-foreground/5 px-4 py-3 text-sm leading-relaxed text-foreground'>
                      {text}
                    </div>
                  </div>
                )
              }

              return (
                <div key={m.id} className='text-sm leading-relaxed text-foreground/80'>
                  {text}
                </div>
              )
            })}

            {state.cvParsed && state.cvProfile && (
              <div className='group flex items-start justify-between gap-2 border-l-2 border-foreground/20 py-1 pl-3'>
                <div>
                  <Text as='p' className='font-mono text-sm text-foreground'>
                    ✓ {state.cvProfile.name} — {state.cvProfile.title}
                  </Text>
                  <Text as='p' className='mt-0.5 font-mono text-xs text-muted-foreground'>
                    {state.cvProfile.stack.length} skills · {state.cvProfile.projects} projects ·{' '}
                    {state.cvProfile.experience} roles
                  </Text>
                </div>
                {!state.complete && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    aria-label='Remove CV and upload a different one'
                    title='Remove CV and upload a different one'
                    onClick={handleRemoveCv}
                    className='shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100'
                  >
                    <X className='h-3.5 w-3.5' />
                  </Button>
                )}
              </div>
            )}

            {state.complete && <div className='text-sm text-foreground/80'>✓ Your Herald is live — redirecting...</div>}

            {state.completionError && (
              <div className='text-sm text-destructive'>
                {state.completionError} Try a different username, or send your last message again.
              </div>
            )}

            {uploading && <div className='animate-pulse text-sm text-muted-foreground'>Extracting your profile...</div>}
            {isThinking && !uploading && <div className='animate-pulse text-sm text-muted-foreground'>...</div>}

            {status === 'error' && !state.complete && (
              <div className='flex items-center gap-3'>
                <Text as='span' className='text-sm text-destructive'>
                  Something went wrong. Try again?
                </Text>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => regenerate()}
                  className='h-7 rounded-none font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground'
                >
                  Retry
                </Button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input — fixed at bottom */}
      <input ref={fileRef} type='file' accept='.pdf,.txt,.md' onChange={handleFileUpload} className='hidden' />

      <div className='fixed bottom-0 left-0 right-0 border-t border-border bg-background'>
        <div className='mx-auto max-w-[560px] px-6 py-4'>
          {pendingCompletion && !state.complete ? (
            <Button
              type='button'
              variant='outline'
              onClick={() =>
                handleComplete(pendingCompletion.username, pendingCompletion.githubHandle, pendingCompletion.toolCallId)
              }
              className='h-12 w-full rounded-none border-border bg-card font-mono text-sm uppercase tracking-[0.15em] text-foreground hover:bg-card hover:border-foreground/30'
            >
              Create My Herald Profile
            </Button>
          ) : state.waitingForCv && !state.cvParsed && !uploading ? (
            cvPasteMode ? (
              <div className='flex flex-col gap-2'>
                <Textarea
                  className='h-32 resize-none border-border bg-card font-sans text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0'
                  placeholder='Paste your CV text here...'
                  value={cvPasteText}
                  onChange={(e) => setCvPasteText(e.target.value)}
                  autoFocus
                />
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleCvPasteSubmit}
                    disabled={!cvPasteText.trim()}
                    className='h-10 flex-1 rounded-none border-border font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground'
                  >
                    Extract Profile
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => {
                      setCvPasteMode(false)
                      setCvPasteText('')
                    }}
                    className='h-10 rounded-none font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground'
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => fileRef.current?.click()}
                  className='h-12 flex-1 justify-start rounded-none border-border bg-card px-4 font-mono text-sm text-muted-foreground hover:bg-card hover:border-foreground/30 hover:text-foreground'
                >
                  📎 Upload PDF
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setCvPasteMode(true)}
                  className='h-12 flex-1 rounded-none border-border bg-card px-4 font-mono text-sm text-muted-foreground hover:bg-card hover:border-foreground/30 hover:text-foreground'
                >
                  Paste as text
                </Button>
              </div>
            )
          ) : (
            <div className='flex gap-2'>
              <Input
                className='h-12 rounded-none border-border bg-card px-4 font-sans text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder='Your answer...'
                disabled={isThinking || state.complete || uploading}
              />
              <Button
                type='button'
                variant='outline'
                onClick={handleSend}
                disabled={isThinking || !input.trim() || state.complete || uploading}
                className='h-12 shrink-0 rounded-none border-border px-5 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground hover:bg-transparent hover:text-foreground'
              >
                Send
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
