import { PROJECT_IDS } from '@atta/cms'

export const PROJECT_CONFIG = {
  vada: {
    projectId: PROJECT_IDS.vada,
    configDocId: 'vadaConfig',
    previewUrl: 'http://localhost:3003',
    displayName: 'Vāda'
  },
  atta: {
    projectId: PROJECT_IDS.atta,
    configDocId: 'attaConfig',
    previewUrl: 'http://localhost:3001',
    displayName: 'Attā'
  },
  herald: {
    projectId: PROJECT_IDS.herald,
    configDocId: 'heraldConfig',
    previewUrl: 'http://localhost:3000',
    displayName: 'Herald'
  },
  vitakka: {
    projectId: PROJECT_IDS.vitakka,
    configDocId: 'vitakkaConfig',
    previewUrl: 'http://localhost:3002',
    displayName: 'Vitakka'
  }
} as const

export type ProjectKey = keyof typeof PROJECT_CONFIG
export const PROJECT_KEYS = Object.keys(PROJECT_CONFIG) as Array<keyof typeof PROJECT_CONFIG>
export const DEFAULT_PROJECT: ProjectKey = 'vada'

export function isValidProject(key: string): key is ProjectKey {
  return key in PROJECT_CONFIG
}
