'use server'

import { cmsWriteClient } from '@atta/cms'
import type { ThemeEditorData } from './_types'

export async function createThemeAction(name: string, description?: string): Promise<{ _id: string; name: string }> {
  try {
    const doc = {
      _type: 'uiTheme' as const,
      name,
      ...(description?.trim() ? { description: description.trim() } : {})
    }
    const result = await cmsWriteClient.create(doc)
    return { _id: result._id, name: result.name as string }
  } catch {
    throw new Error('Failed to create theme. Check your SANITY_API_TOKEN.')
  }
}

export async function renameThemeAction(id: string, name: string): Promise<void> {
  try {
    await cmsWriteClient.patch(id).set({ name }).commit()
  } catch {
    throw new Error('Failed to rename theme.')
  }
}

export async function publishThemeAction(id: string, vars: Record<string, string>): Promise<void> {
  try {
    await cmsWriteClient.patch(id).set({ dark: vars }).commit()
  } catch {
    throw new Error('Failed to publish theme vars.')
  }
}

export async function updateThemeAction(id: string, data: ThemeEditorData): Promise<void> {
  try {
    const patch: Record<string, unknown> = {
      name: data.name,
      description: data.description ?? '',
      light: data.light ?? {},
      dark: data.dark ?? {},
      typography: data.typography ?? {},
      spacing: data.spacing ?? {},
      shadows: data.shadows ?? {}
    }
    await cmsWriteClient.patch(id).set(patch).commit()
  } catch {
    throw new Error('Failed to update theme.')
  }
}

export async function deleteThemeAction(id: string): Promise<void> {
  try {
    await cmsWriteClient.delete(id)
  } catch {
    throw new Error('Failed to delete theme.')
  }
}

export async function setActiveThemeAction(id: string, colorScheme: 'dark' | 'light'): Promise<void> {
  try {
    await cmsWriteClient
      .patch('vadaConfig')
      .set({
        'userInterface.theme': { _type: 'reference', _ref: id },
        'userInterface.colorScheme': colorScheme
      })
      .commit()
  } catch {
    throw new Error('Failed to set active theme.')
  }
}
