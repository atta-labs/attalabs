import { PROJECT_IDS } from '@atta/cms'

/**
 * An app's component library is its Sanity config's `userInterface.library`, read by
 * `packages/ui/scripts/generate-ui.ts` at build time and by `NextWebShell` at runtime
 * — see `.claude/skills/ui-library-system/SKILL.md`. This admin's Library picker has
 * no write action, so every project below carries a note saying where to change it.
 */
const libraryNote = (studio: string) =>
  `Set in the ${studio} Sanity Studio (config → User Interface → Library ID), then redeploy.`

export const PROJECT_CONFIG = {
  vada: {
    projectId: PROJECT_IDS.vada,
    configDocId: 'vadaConfig',
    previewUrl: 'http://localhost:3003',
    displayName: 'Vāda',
    libraryPinNote: libraryNote('vada')
  },
  herald: {
    projectId: PROJECT_IDS.herald,
    configDocId: 'heraldConfig',
    previewUrl: 'http://localhost:3000',
    displayName: 'Herald',
    libraryPinNote: libraryNote('herald')
  },
  vinayaPortal: {
    projectId: PROJECT_IDS.vinayaPortal,
    configDocId: 'vinayaPortalConfig',
    previewUrl: 'http://localhost:3007',
    displayName: 'Vinaya Portal',
    libraryPinNote: libraryNote('vinayaPortal')
  },
  vinayaStudio: {
    projectId: PROJECT_IDS.vinayaStudio,
    configDocId: 'vinayaStudioConfig',
    previewUrl: 'http://localhost:3008',
    displayName: 'Vinaya Studio',
    libraryPinNote: libraryNote('vinayaStudio')
  }
} as const

export type ProjectKey = keyof typeof PROJECT_CONFIG
export const PROJECT_KEYS = Object.keys(PROJECT_CONFIG) as Array<keyof typeof PROJECT_CONFIG>
export const DEFAULT_PROJECT: ProjectKey = 'vada'

export function isValidProject(key: string): key is ProjectKey {
  return key in PROJECT_CONFIG
}
