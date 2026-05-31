import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { CETANA_HOME, CONFIG_PATH } from './paths.js'

const ConfigSchema = z.object({
  github: z.object({
    owner: z.string(),
    repo: z.string(),
    token: z.string().optional()
  }),
  defaults: z
    .object({
      claudeModel: z.string().default('claude-sonnet-4-6'),
      permissionMode: z.enum(['default', 'acceptEdits']).default('acceptEdits')
    })
    .default({}),
  repoPath: z.string().optional()
})

export type CetanaConfig = z.infer<typeof ConfigSchema>

const DEFAULT_CONFIG: CetanaConfig = {
  github: { owner: 'daniboomerang', repo: 'atta.ai' },
  defaults: { claudeModel: 'claude-sonnet-4-6', permissionMode: 'acceptEdits' }
}

export function loadConfig(): CetanaConfig {
  if (!existsSync(CETANA_HOME)) {
    mkdirSync(CETANA_HOME, { recursive: true })
  }
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2))
    return DEFAULT_CONFIG
  }
  const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
  return ConfigSchema.parse(raw)
}
