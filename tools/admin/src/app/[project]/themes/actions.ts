'use server'

import { getCmsClientsForProject } from '@/lib/cms-for-project'
import { PROJECT_CONFIG } from '@/lib/project-config'
import type { ProjectKey } from '@/lib/project-config'
import type { ThemeEditorData } from './_types'

export async function createThemeAction(
  project: ProjectKey,
  name: string,
  description?: string
): Promise<{ _id: string; name: string }> {
  try {
    const { writeClient } = getCmsClientsForProject(project)
    const doc = {
      _type: 'uiTheme' as const,
      name,
      ...(description?.trim() ? { description: description.trim() } : {})
    }
    const result = await writeClient.create(doc)
    return { _id: result._id, name: result.name as string }
  } catch {
    throw new Error('Failed to create theme. Check your SANITY_API_TOKEN for this project.')
  }
}

export async function renameThemeAction(project: ProjectKey, id: string, name: string): Promise<void> {
  try {
    const { writeClient } = getCmsClientsForProject(project)
    await writeClient.patch(id).set({ name }).commit()
  } catch {
    throw new Error('Failed to rename theme.')
  }
}

export async function publishThemeAction(project: ProjectKey, id: string, vars: Record<string, string>): Promise<void> {
  try {
    const { writeClient } = getCmsClientsForProject(project)
    await writeClient.patch(id).set({ dark: vars }).commit()
  } catch {
    throw new Error('Failed to publish theme vars.')
  }
}

export async function updateThemeAction(project: ProjectKey, id: string, data: ThemeEditorData): Promise<void> {
  try {
    const { writeClient } = getCmsClientsForProject(project)
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
  } catch {
    throw new Error('Failed to update theme.')
  }
}

export async function deleteThemeAction(project: ProjectKey, id: string): Promise<void> {
  try {
    const { writeClient } = getCmsClientsForProject(project)
    await writeClient.delete(id)
  } catch {
    throw new Error('Failed to delete theme.')
  }
}

export async function setActiveThemeAction(
  project: ProjectKey,
  id: string,
  colorScheme: 'dark' | 'light'
): Promise<void> {
  try {
    const { writeClient } = getCmsClientsForProject(project)
    const { configDocId } = PROJECT_CONFIG[project]
    await writeClient
      .patch(configDocId)
      .set({
        'userInterface.theme': { _type: 'reference', _ref: id },
        'userInterface.colorScheme': colorScheme
      })
      .commit()
  } catch {
    throw new Error('Failed to set active theme.')
  }
}
