// Browser-side API key probe. Ports the old server-side validateModelConfig
// pattern (deleted from engine/agents.ts during the BYOK inversion) back
// into the identity package so key entry can be validated at save time,
// before the first deliberation turn. See /trust.
//
// Each probe sends a minimal chat request to the provider with max_tokens
// capped and an early stop sequence. A 200 response means the key is valid
// and the model is reachable. 401/403 → invalid key. 404 or model-not-found
// text → wrong model ID. Rate-limit signals are treated as transient and
// bubbled up verbatim so the user can distinguish "wrong key" from "try again
// in a minute".
//
// Mock mode short-circuit: when NEXT_PUBLIC_VADA_MOCK_MODE=true the probe
// returns ok without a network call. This matches the mock-mode contract —
// "no real provider calls are being made" — and lets a developer use any
// fake string as a key for UI testing without hitting a 401 at save time.

import { OLLAMA_BASE_URL, VENDORS, type VendorId } from '@atta/models'
import { isMockModeActive } from './mock'

// `kind` lets callers distinguish a dead key from a transient/environmental
// failure. Rate limits and model-not-found mean the key is probably fine —
// dropping it on those is destructive. Only `invalid_key` warrants removal.
export type ProbeKind = 'ok' | 'invalid_key' | 'rate_limit' | 'model_not_found' | 'unreachable' | 'unknown'

export interface ProbeResult {
  ok: boolean
  kind: ProbeKind
  error?: string
}

// Default probe models per vendor. Chosen for broad account availability.
// New openai-compat vendors fall back to a minimal chat probe via registry baseURL.
const DEFAULT_PROBE_MODEL: Partial<Record<VendorId, string>> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  google: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  ollama: 'llama3.3',
  xai: 'grok-3-mini',
  deepseek: 'deepseek-chat',
  cerebras: 'llama3.1-8b',
  mistral: 'mistral-small-latest',
  together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
  fireworks: 'accounts/fireworks/models/llama-v3p1-8b-instruct'
}

async function probeOllama(): Promise<ProbeResult> {
  // Ollama has no API key concept. The probe just verifies that the local
  // server is reachable. /api/tags returns 200 with the list of installed
  // models (may be empty — that's still "configured correctly", the user
  // just needs to `ollama pull <model>`).
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    if (res.ok) return { ok: true, kind: 'ok' }
    return { ok: false, kind: 'unreachable', error: `Ollama responded ${res.status}. Is it running?` }
  } catch (err) {
    return {
      ok: false,
      kind: 'unreachable',
      error:
        err instanceof TypeError
          ? `Could not reach Ollama at ${OLLAMA_BASE_URL}. Start it with 'ollama serve' and set OLLAMA_ORIGINS=${typeof window !== 'undefined' ? window.location.origin : '*'} before running to allow browser access.`
          : err instanceof Error
            ? err.message
            : String(err)
    }
  }
}

async function postAndClassify(url: string, headers: Record<string, string>, body: unknown): Promise<ProbeResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    })
    if (res.ok) return { ok: true, kind: 'ok' }
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const msg =
      (json?.error as { message?: string } | undefined)?.message ??
      (json?.message as string | undefined) ??
      `HTTP ${res.status}`
    const msgStr = String(msg)
    // Check 401/403 before rate-limit regex: Google's 429 body also mentions
    // "quota", but some providers return 401 with a "key invalid" body that
    // also includes "rate" — status code is the stronger signal.
    if (res.status === 401 || res.status === 403 || /invalid.*key|api.?key.*not.?valid|authentication/i.test(msgStr))
      return { ok: false, kind: 'invalid_key', error: 'Invalid API key. Please check your credentials.' }
    if (res.status === 429 || /quota|rate.?limit|exceeded|TPD|TPM/i.test(msgStr))
      return {
        ok: false,
        kind: 'rate_limit',
        error: 'Rate limit or quota exceeded. Try again later or upgrade your plan.'
      }
    if (res.status === 404 || /model.*not.*found|does not exist/i.test(msgStr))
      return {
        ok: false,
        kind: 'model_not_found',
        error: 'Model not found for this key. The key is probably valid for other models.'
      }
    return { ok: false, kind: 'unknown', error: msgStr }
  } catch (err) {
    return { ok: false, kind: 'unreachable', error: err instanceof Error ? err.message : String(err) }
  }
}

export async function probeProviderKey(provider: VendorId, apiKey: string, modelId?: string): Promise<ProbeResult> {
  // See comment at the top of this file. Mock mode = no real provider call,
  // including the validation probe itself.
  if (isMockModeActive()) return { ok: true, kind: 'ok' }

  if (provider === 'ollama') return probeOllama()

  const model = modelId ?? DEFAULT_PROBE_MODEL[provider] ?? 'default'

  switch (provider) {
    case 'anthropic':
      return postAndClassify(
        'https://api.anthropic.com/v1/messages',
        {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        { model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 16 }
      )
    case 'google':
      return postAndClassify(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {},
        {
          contents: [{ parts: [{ text: 'hi' }] }],
          generationConfig: { maxOutputTokens: 16, stopSequences: ['\n'] }
        }
      )
    default: {
      // All openai-compat vendors: use the registry's baseURL.
      const vendor = VENDORS[provider]
      const baseURL = vendor?.baseURL ?? `https://api.${provider}.com/v1`
      return postAndClassify(
        `${baseURL}/chat/completions`,
        { Authorization: `Bearer ${apiKey}` },
        { model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 16, stop: ['\n'] }
      )
    }
  }
}

export function providerLabel(p: VendorId): string {
  return VENDORS[p]?.label ?? p
}
