// Browser-side agent invocation. This is the only place in the codebase that calls
// provider APIs with a user key. Keys are passed in here — never persisted,
// never transmitted to the Vāda server. See /trust for the full BYOK architecture
// guarantee.
//
// `dangerouslyAllowBrowser: true` on each client: this flag exists because
// embedding a developer's own server key in browser JS would leak it to every
// visitor. BYOK inverts that: the key belongs to the user, is in the user's own
// browser, entered by the user themselves. This is the canonical BYOK pattern,
// not the foot-gun.

import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import { OLLAMA_BASE_URL, type RouteProvider } from '@atta/models'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import { streamText } from 'ai'
import { createOllama } from 'ollama-ai-provider-v2'

// Ollama optimization defaults for Vāda's workload.
//
// Only num_ctx is plumbed through here — the ollama-ai-provider-v2 zod schema
// for providerOptions.ollama.options accepts num_ctx / num_predict / sampling
// knobs and nothing else. num_batch and keep_alive are dropped by the parser.
//
// - num_ctx: 8192 is plenty for 3 rounds of 4 agents (~5-7k tokens worst case).
//   The model default of 32768 wastes ~4.5GB of KV cache and slows prompt eval.
//
// To extend keep_alive (so the model stays loaded between deliberation turns
// and you don't pay reload cost mid-run), start Ollama with the env var:
//   OLLAMA_KEEP_ALIVE=30m ollama serve
// Ollama's default is 5m which is usually fine for single-shot deliberations.
const OLLAMA_OPTIONS = {
  numCtx: 8192
} as const

export interface InvokeParams {
  provider: RouteProvider
  modelId: string
  apiKey: string
  systemPrompt: string
  userPrompt: string
  signal?: AbortSignal
}

export interface InvokeUsage {
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
}

export interface InvokeResult {
  textStream: AsyncIterable<string>
  fullText: () => Promise<string>
  /**
   * Token usage after the stream settles. Resolves `null` fields when the
   * provider didn't report counts (rare — Ollama via ollama-ai-provider-v2
   * returns promptEvalCount + evalCount, and the hosted providers all
   * surface usage).
   */
  usage: () => Promise<InvokeUsage>
}

function resolveModel(provider: RouteProvider, modelId: string, apiKey: string): LanguageModel {
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(modelId)
    case 'openai':
      return createOpenAI({ apiKey })(modelId)
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(modelId)
    case 'groq':
      return createGroq({ apiKey })(modelId)
    case 'openrouter':
      return createOpenRouter({ apiKey })(modelId)
    case 'ollama': {
      // Native Ollama provider instead of OpenAI-compat — lets us pass Ollama
      // options (num_ctx, keep_alive, num_batch) that the /v1 endpoint strips.
      // These defaults cut prompt-eval time on long-transcript rounds and keep
      // the model loaded between agent turns during a deliberation.
      const ollama = createOllama({ baseURL: `${OLLAMA_BASE_URL}/api` })
      return ollama(modelId) as LanguageModel
    }
  }
}

export async function invokeAgent(params: InvokeParams): Promise<InvokeResult> {
  const model = resolveModel(params.provider, params.modelId, params.apiKey)

  // Ollama-specific options get passed through via providerOptions so the
  // underlying /api/chat request includes them. Ignored for other providers.
  // The only knob that meaningfully moves performance here is num_ctx.
  const providerOptions =
    params.provider === 'ollama'
      ? {
          ollama: {
            options: {
              num_ctx: OLLAMA_OPTIONS.numCtx
            }
          }
        }
      : undefined

  const result = streamText({
    model,
    system: params.systemPrompt,
    prompt: params.userPrompt,
    abortSignal: params.signal,
    // onError claims the error for the SDK's own rejection fanout. Without
    // this, every unused PromiseLike field (result.text, finishReason, usage,
    // response, warnings, steps, providerMetadata...) rejects independently,
    // which Next's dev overlay surfaces as a red banner even when our caller
    // try/catch already showed a toast. Set to a no-op — the real handling
    // happens in the for-await loop in useDeliberation.
    onError: (err) => {
      const actualError = err?.error ?? err
      if (actualError instanceof Error) {
        console.error('[invoke] stream error:', actualError.message, actualError)
      } else {
        console.error('[invoke] stream error:', actualError)
      }
    },
    ...(providerOptions ? { providerOptions } : {})
  })

  // Belt-and-braces: `onError` should be enough in AI SDK v6, but defensively
  // swallow every promise-like field we know streamText exposes so older /
  // patched SDKs don't leak an unhandled rejection through.
  const swallow = (p: unknown) => {
    if (p && typeof (p as Promise<unknown>).then === 'function') {
      Promise.resolve(p as PromiseLike<unknown>).catch(() => {})
    }
  }
  const r = result as unknown as Record<string, unknown>
  for (const k of [
    'text',
    'finishReason',
    'usage',
    'response',
    'request',
    'providerMetadata',
    'experimental_providerMetadata',
    'warnings',
    'steps',
    'reasoning',
    'reasoningDetails',
    'sources',
    'files',
    'toolCalls',
    'toolResults'
  ]) {
    swallow(r[k])
  }

  return {
    textStream: result.textStream,
    fullText: async () => await result.text,
    usage: async () => {
      try {
        const raw = (await result.usage) as
          | { inputTokens?: number | null; outputTokens?: number | null; totalTokens?: number | null }
          | null
          | undefined
        return {
          inputTokens: raw?.inputTokens ?? null,
          outputTokens: raw?.outputTokens ?? null,
          totalTokens: raw?.totalTokens ?? null
        }
      } catch {
        return { inputTokens: null, outputTokens: null, totalTokens: null }
      }
    }
  }
}
