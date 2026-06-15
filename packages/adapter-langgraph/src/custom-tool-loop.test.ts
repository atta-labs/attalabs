import { describe, expect, it } from 'bun:test'
import type Anthropic from '@anthropic-ai/sdk'
import {
  MAX_CUSTOM_TOOL_ITERATIONS,
  customToolSpecToAnthropicTool,
  resolveRegisteredCustomTools,
  runAnthropicCustomToolLoop,
  type AnthropicMessagesCreate,
  type CustomToolHandlerMap
} from './custom-tool-loop'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const addSpec = {
  name: 'add',
  description: 'Add two numbers',
  parameters: {
    type: 'object',
    properties: {
      a: { type: 'number' },
      b: { type: 'number' }
    },
    required: ['a', 'b']
  }
}

function makeTextResponse(text: string): Anthropic.Message {
  return {
    id: 'msg_text',
    type: 'message',
    role: 'assistant',
    model: 'claude-test',
    stop_reason: 'end_turn',
    stop_sequence: null,
    content: [{ type: 'text', text, citations: null }],
    usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: null, cache_read_input_tokens: null }
  } as unknown as Anthropic.Message
}

function makeToolUseResponse(name: string, input: Record<string, unknown>, id = 'tu_1'): Anthropic.Message {
  return {
    id: 'msg_tool',
    type: 'message',
    role: 'assistant',
    model: 'claude-test',
    stop_reason: 'tool_use',
    stop_sequence: null,
    content: [{ type: 'tool_use', id, name, input }],
    usage: { input_tokens: 8, output_tokens: 4, cache_creation_input_tokens: null, cache_read_input_tokens: null }
  } as unknown as Anthropic.Message
}

// ─── Additivity invariant — gating ───────────────────────────────────────────

describe('resolveRegisteredCustomTools — additivity gate', () => {
  // The Vāda-safety invariant lives here: if any of these return non-empty
  // for an agent that today declares no customTools, the loop will activate
  // for a Vāda agent. Every assertion below must hold.

  it('returns [] when agent has no customTools (the Vāda case)', () => {
    const handlers: CustomToolHandlerMap = { add: async () => 42 }
    expect(
      resolveRegisteredCustomTools(
        {
          /* no customTools */
        },
        handlers
      )
    ).toEqual([])
  })

  it('returns [] when agent has customTools but no handler is registered', () => {
    const handlers: CustomToolHandlerMap = {}
    expect(resolveRegisteredCustomTools({ customTools: [addSpec] }, handlers)).toEqual([])
  })

  it('returns [] when handlers map is undefined (the no-opt-in case)', () => {
    expect(resolveRegisteredCustomTools({ customTools: [addSpec] }, undefined)).toEqual([])
  })

  it('returns [] when agent has customTools and matching handler BUT structured output is requested', () => {
    // Structured output uses Anthropic's tool_choice forced single-tool path —
    // multi-turn loop cannot be activated under structured output.
    const handlers: CustomToolHandlerMap = { add: async () => 42 }
    expect(
      resolveRegisteredCustomTools({ customTools: [addSpec], outputSchema: { type: 'object' } }, handlers)
    ).toEqual([])
  })

  it('returns the spec when agent declares it AND a matching handler is registered', () => {
    const handlers: CustomToolHandlerMap = { add: async () => 42 }
    const result = resolveRegisteredCustomTools({ customTools: [addSpec] }, handlers)
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('add')
  })

  it('filters per-name: only specs with matching handlers are returned', () => {
    const handlers: CustomToolHandlerMap = { add: async () => 42 }
    const subSpec = { ...addSpec, name: 'subtract' }
    const result = resolveRegisteredCustomTools({ customTools: [addSpec, subSpec] }, handlers)
    expect(result.map((s) => s.name)).toEqual(['add'])
  })
})

// ─── Spec → Anthropic tool conversion ─────────────────────────────────────────

describe('customToolSpecToAnthropicTool', () => {
  it('maps name, description, parameters → input_schema', () => {
    const tool = customToolSpecToAnthropicTool(addSpec)
    expect(tool).toEqual({
      name: 'add',
      description: 'Add two numbers',
      input_schema: addSpec.parameters
    })
  })
})

// ─── Positive: model emits tool_use → handler runs → loop completes ─────────

describe('runAnthropicCustomToolLoop — positive path', () => {
  it('runs handler when model emits tool_use, then completes on end_turn', async () => {
    const handlerCalls: Array<Record<string, unknown>> = []
    const handlers: CustomToolHandlerMap = {
      add: async (args) => {
        handlerCalls.push(args)
        return (args.a as number) + (args.b as number)
      }
    }

    const sentMessages: Anthropic.Messages.MessageParam[][] = []
    let callCount = 0
    const messagesCreate: AnthropicMessagesCreate = async (params) => {
      sentMessages.push(params.messages as Anthropic.Messages.MessageParam[])
      callCount += 1
      if (callCount === 1) {
        return makeToolUseResponse('add', { a: 2, b: 3 }, 'tu_call1')
      }
      return makeTextResponse('The sum is 5.')
    }

    const result = await runAnthropicCustomToolLoop({
      messagesCreate,
      model: 'claude-test',
      systemPrompt: 'You are a calculator.',
      userPrompt: 'What is 2+3?',
      tools: [customToolSpecToAnthropicTool(addSpec)],
      handlers
    })

    // Loop ran the handler exactly once with the model's args
    expect(handlerCalls).toEqual([{ a: 2, b: 3 }])

    // Final content is the model's post-tool text
    expect(result.content).toBe('The sum is 5.')

    // Token totals accumulate across both turns
    expect(result.tokensInput).toBe(10 + 8)
    expect(result.tokensOutput).toBe(5 + 4)

    // Two calls were made (the loop iterates once for the tool_use, once for the final text)
    expect(callCount).toBe(2)

    // Second call carries the assistant tool_use + a user tool_result
    expect(sentMessages[1]).toHaveLength(3)
    expect(sentMessages[1]![0]!.role).toBe('user')
    expect(sentMessages[1]![1]!.role).toBe('assistant')
    expect(sentMessages[1]![2]!.role).toBe('user')
    const finalUserContent = sentMessages[1]![2]!.content as Anthropic.ToolResultBlockParam[]
    expect(finalUserContent[0]!.type).toBe('tool_result')
    expect(finalUserContent[0]!.tool_use_id).toBe('tu_call1')
    expect(finalUserContent[0]!.content).toBe('5')
  })

  it('returns text and no handler invocation when first response is end_turn', async () => {
    // If the model decides not to use any tool, the loop returns immediately.
    let calls = 0
    const handlers: CustomToolHandlerMap = {
      add: async () => {
        throw new Error('handler should not be called')
      }
    }
    const messagesCreate: AnthropicMessagesCreate = async () => {
      calls += 1
      return makeTextResponse('No tool needed.')
    }

    const result = await runAnthropicCustomToolLoop({
      messagesCreate,
      model: 'claude-test',
      systemPrompt: 'You are a calculator.',
      userPrompt: 'Hi.',
      tools: [customToolSpecToAnthropicTool(addSpec)],
      handlers
    })

    expect(calls).toBe(1)
    expect(result.content).toBe('No tool needed.')
  })

  it('captures handler errors as tool_result blocks marked is_error', async () => {
    const handlers: CustomToolHandlerMap = {
      add: async () => {
        throw new Error('boom')
      }
    }

    const messagesCreate: AnthropicMessagesCreate = async (params) => {
      const turn = params.messages.length
      if (turn === 1) return makeToolUseResponse('add', { a: 1, b: 2 }, 'tu_err')
      // On the second call, the user message should contain a tool_result with is_error=true
      const lastUser = params.messages[params.messages.length - 1] as Anthropic.Messages.MessageParam
      const blocks = lastUser.content as Anthropic.ToolResultBlockParam[]
      expect(blocks[0]!.is_error).toBe(true)
      expect(blocks[0]!.content).toContain('boom')
      return makeTextResponse('Tool failed, returning fallback.')
    }

    const result = await runAnthropicCustomToolLoop({
      messagesCreate,
      model: 'claude-test',
      systemPrompt: '',
      userPrompt: 'go',
      tools: [],
      handlers
    })
    expect(result.content).toBe('Tool failed, returning fallback.')
  })
})

// ─── Bound: max iterations ────────────────────────────────────────────────────

describe('runAnthropicCustomToolLoop — iteration bound', () => {
  it('throws after the configured maxIterations when model keeps emitting tool_use', async () => {
    let toolUseCount = 0
    const handlers: CustomToolHandlerMap = { add: async () => 1 }
    const messagesCreate: AnthropicMessagesCreate = async () => {
      toolUseCount += 1
      return makeToolUseResponse('add', { a: 1, b: 1 }, `tu_${toolUseCount}`)
    }

    await expect(
      runAnthropicCustomToolLoop({
        messagesCreate,
        model: 'claude-test',
        systemPrompt: '',
        userPrompt: 'loop please',
        tools: [],
        handlers,
        maxIterations: 3
      })
    ).rejects.toThrow(/Exceeded MAX_CUSTOM_TOOL_ITERATIONS \(3\)/)

    expect(toolUseCount).toBe(3)
  })

  it('uses MAX_CUSTOM_TOOL_ITERATIONS as the default bound', () => {
    // Constant is exported for callers to reason about budgets; pin it so
    // bumping the default is an explicit, reviewable change.
    expect(MAX_CUSTOM_TOOL_ITERATIONS).toBe(10)
  })
})
