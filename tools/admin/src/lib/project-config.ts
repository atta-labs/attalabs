import { PROJECT_IDS } from '@atta/cms'

/**
 * Where the build-time UI library pin for each admin-reachable project lives.
 * `packages/ui/scripts/generate-ui.ts` reads this file, not Sanity, at build
 * time — see `.claude/skills/ui-library-system/SKILL.md`. The Library picker
 * on a project's `/themes` page can no longer change what a build emits by
 * itself, so every project below carries a note explaining what to do instead.
 */
export const LIBRARY_PIN_FILE = 'packages/ui/scripts/ui-library-pins.ts'

export const PROJECT_CONFIG = {
  vada: {
    projectId: PROJECT_IDS.vada,
    configDocId: 'vadaConfig',
    previewUrl: 'http://localhost:3003',
    displayName: 'Vāda',
    libraryPinNote: `Pinned at build time in ${LIBRARY_PIN_FILE} ("vada" entry) — edit it and redeploy to change.`
  },
  herald: {
    projectId: PROJECT_IDS.herald,
    configDocId: 'heraldConfig',
    previewUrl: 'http://localhost:3000',
    displayName: 'Herald',
    libraryPinNote: `Pinned at build time in ${LIBRARY_PIN_FILE} ("herald" entry) — edit it and redeploy to change.`
  },
  vinaya: {
    projectId: PROJECT_IDS.vinaya,
    configDocId: 'vinayaConfig',
    previewUrl: 'http://localhost:3006',
    displayName: 'Vinaya',
    libraryPinNote: `This writes to vinayaConfig, which neither real Vinaya build reads — edit "vinayaPortal" or "vinayaStudio" in ${LIBRARY_PIN_FILE} instead.`
  }
} as const

export type ProjectKey = keyof typeof PROJECT_CONFIG
export const PROJECT_KEYS = Object.keys(PROJECT_CONFIG) as Array<keyof typeof PROJECT_CONFIG>
export const DEFAULT_PROJECT: ProjectKey = 'vada'

export function isValidProject(key: string): key is ProjectKey {
  return key in PROJECT_CONFIG
}
