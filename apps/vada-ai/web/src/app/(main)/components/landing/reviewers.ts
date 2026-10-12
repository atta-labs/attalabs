// The reviewer slots the landing shows: one model per slot, each from a different vendor, rendered
// through `VadaAgent` (vendor icon + vendor colour when `userConfigured`). `dot` is the same vendor
// colour as a literal class, for answer markers that are not agents themselves.
export const REVIEWERS = [
  { vendor: 'Anthropic', model: 'claude-sonnet-4-6', dot: 'bg-[var(--vendor-anthropic)]' },
  { vendor: 'OpenAI', model: 'gpt-4o', dot: 'bg-[var(--vendor-openai)]' },
  { vendor: 'Google', model: 'gemini-2.5-pro', dot: 'bg-[var(--vendor-google)]' },
  { vendor: 'xAI', model: 'grok-3', dot: 'bg-[var(--vendor-xai)]' }
] as const
