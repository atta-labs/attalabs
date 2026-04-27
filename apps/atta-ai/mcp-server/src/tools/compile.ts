import { loadSpec, compileSpec } from '@atta/engine'
import { CompileInputSchema, type CompileInput } from '../schema'

export interface CompileOutput {
  ok: boolean
  plan?: unknown
  error?: string
}

export async function runCompile(input: unknown): Promise<CompileOutput> {
  try {
    const parsed = CompileInputSchema.parse(input)
    return await compileYaml(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Validation failed: ${message}` }
  }
}

async function compileYaml(input: CompileInput): Promise<CompileOutput> {
  try {
    const spec = loadSpec(input.yaml)
    const plan = compileSpec(spec, 'placeholder question')
    return { ok: true, plan }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Compile failed: ${message}` }
  }
}
