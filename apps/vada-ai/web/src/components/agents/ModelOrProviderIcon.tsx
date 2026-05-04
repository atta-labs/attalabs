'use client'

import { ModelIcon } from '@atta/ui'
import { ProviderIcon } from '@lobehub/icons'
import { inferVendor } from './vendors'

// Prefixes that @lobehub/icons ModelIcon renders with a real icon (not the brain fallback).
// Anything else falls back to the provider logo so users never see a generic brain.
const LOBEHUB_MODEL_PREFIXES = ['claude-', 'gpt-', 'o1-', 'o3-', 'o4-', 'gemini-', 'deepseek-', 'llama-']

function hasModelIcon(model: string): boolean {
  const lower = model.toLowerCase()
  return LOBEHUB_MODEL_PREFIXES.some((p) => lower.startsWith(p))
}

interface ModelOrProviderIconProps {
  model: string
  size?: number
}

export function ModelOrProviderIcon({ model, size = 36 }: ModelOrProviderIconProps) {
  if (hasModelIcon(model)) {
    return <ModelIcon model={model} size={size} type='avatar' />
  }
  const vendor = inferVendor(model)
  if (vendor) {
    return <ProviderIcon provider={vendor} size={size} type='avatar' />
  }
  return <ModelIcon model={model} size={size} type='avatar' />
}
