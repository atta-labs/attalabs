'use client'

import { findModelEntryByModelId, useCatalog } from '@atta/models'
import { ModelIcon } from '@atta/ui/components'
import { ProviderIcon } from '@lobehub/icons'
import { Shuffle } from 'lucide-react'
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

/**
 * Shown when a reviewer slot has no model selected yet.
 * Communicates "any model / you choose" — visually neutral, no vendor brand.
 */
export function NoModelSelectedIcon({ size = 36 }: { size?: number }) {
  return (
    <Shuffle
      aria-label='No model selected — pick one to configure this slot'
      className='text-muted-foreground'
      style={{ width: size, height: size }}
    />
  )
}

export function ModelOrProviderIcon({ model, size = 36 }: ModelOrProviderIconProps) {
  const catalog = useCatalog()
  if (hasModelIcon(model)) {
    return <ModelIcon model={model} size={size} type='avatar' />
  }
  // Catalog is the source of truth for which brand to show. Falls back to
  // prefix-matching for the four core vendors when the model isn't in catalog.
  const entry = findModelEntryByModelId(catalog, model)
  const vendor = entry?.displayProvider ?? inferVendor(model)
  if (vendor) {
    return <ProviderIcon provider={vendor} size={size} type='avatar' />
  }
  return <ModelIcon model={model} size={size} type='avatar' />
}
