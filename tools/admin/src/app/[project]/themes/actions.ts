'use server'

import { describeCmsWriteError, getCmsClientsForProject } from '@/lib/cms-for-project'
import type { CmsWriteResult } from '@/lib/cms-for-project'
import { PROJECT_CONFIG } from '@/lib/project-config'
import type { ProjectKey } from '@/lib/project-config'
import type { ThemeEditorData } from './_types'

export async function createThemeAction(
  _project: ProjectKey,
  name: string,
  description?: string
): Promise<{ _id: string; name: string }> {
  try {
    const { writeClient } = getCmsClientsForProject('attalabs')
    const doc = {
      _type: 'uiTheme' as const,
      name,
      ...(description?.trim() ? { description: description.trim() } : {})
    }
    const result = await writeClient.create(doc)
    return { _id: result._id, name: result.name as string }
  } catch {
    throw new Error('Failed to create theme. Check your SANITY_API_TOKEN_ATTALABS or SANITY_API_TOKEN.')
  }
}

export async function renameThemeAction(_project: ProjectKey, id: string, name: string): Promise<void> {
  try {
    const { writeClient } = getCmsClientsForProject('attalabs')
    await writeClient.patch(id).set({ name }).commit()
  } catch {
    throw new Error('Failed to rename theme.')
  }
}

export async function publishThemeAction(
  _project: ProjectKey,
  id: string,
  vars: Record<string, string>
): Promise<void> {
  try {
    const { writeClient } = getCmsClientsForProject('attalabs')
    await writeClient.patch(id).set({ dark: vars }).commit()
  } catch {
    throw new Error('Failed to publish theme vars.')
  }
}

export async function updateThemeAction(_project: ProjectKey, id: string, data: ThemeEditorData): Promise<void> {
  try {
    const { writeClient } = getCmsClientsForProject('attalabs')
    await writeClient
      .patch(id)
      .set({
        name: data.name,
        description: data.description ?? '',
        light: data.light ?? {},
        dark: data.dark ?? {},
        typography: data.typography ?? {},
        spacing: data.spacing ?? {},
        shadows: data.shadows ?? {}
      })
      .commit()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to update theme: ${message}`)
  }
}

export async function deleteThemeAction(_project: ProjectKey, id: string): Promise<void> {
  try {
    const { writeClient } = getCmsClientsForProject('attalabs')
    await writeClient.delete(id)
  } catch {
    throw new Error('Failed to delete theme.')
  }
}

const FONT_STACK_SUFFIX = {
  fontSans: 'sans-serif',
  fontSerif: 'serif',
  fontMono: 'monospace'
} as const

/** Google Fonts family names are alphanumerics, spaces, underscores and hyphens. */
const FONT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/

export async function setThemeFontsAction(
  _project: ProjectKey,
  id: string,
  fonts: Partial<Record<keyof typeof FONT_STACK_SUFFIX, string>>
): Promise<CmsWriteResult> {
  const patch: Record<string, string> = {}
  for (const role of Object.keys(FONT_STACK_SUFFIX) as (keyof typeof FONT_STACK_SUFFIX)[]) {
    const name = fonts[role]
    if (!name) continue
    if (!FONT_NAME_PATTERN.test(name)) {
      return { ok: false, message: `"${name}" isn't a valid font name for ${role}.` }
    }
    patch[`typography.${role}`] = `${name}, ${FONT_STACK_SUFFIX[role]}`
  }
  if (Object.keys(patch).length === 0) return { ok: true }
  try {
    const { writeClient } = getCmsClientsForProject('attalabs')
    await writeClient.patch(id).set(patch).commit()
    return { ok: true }
  } catch (error) {
    return { ok: false, message: describeCmsWriteError(error, 'attalabs', 'save the theme fonts') }
  }
}

export async function setActiveThemeAction(
  project: ProjectKey,
  id: string,
  colorScheme: 'dark' | 'light'
): Promise<CmsWriteResult> {
  try {
    const { writeClient } = getCmsClientsForProject(project)
    const { configDocId } = PROJECT_CONFIG[project]
    await writeClient
      .patch(configDocId)
      .set({
        'userInterface.theme': id,
        'userInterface.colorScheme': colorScheme
      })
      .commit()
    return { ok: true }
  } catch (error) {
    return { ok: false, message: describeCmsWriteError(error, project, 'set the active theme') }
  }
}

export async function setActiveLibraryAction(project: ProjectKey, id: string): Promise<CmsWriteResult> {
  try {
    const { writeClient } = getCmsClientsForProject(project)
    const { configDocId } = PROJECT_CONFIG[project]
    await writeClient
      .patch(configDocId)
      .set({
        'userInterface.library': id
      })
      .commit()
    return { ok: true }
  } catch (error) {
    return { ok: false, message: describeCmsWriteError(error, project, 'set the active library') }
  }
}
