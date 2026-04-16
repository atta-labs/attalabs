'use server'

import { cmsWriteClient } from '@atta/cms'

export async function createThemeAction(name: string): Promise<{ _id: string; name: string }> {
  try {
    const result = await cmsWriteClient.create({ _type: 'uiTheme', name })
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

export async function deleteThemeAction(id: string): Promise<void> {
  try {
    await cmsWriteClient.delete(id)
  } catch {
    throw new Error('Failed to delete theme.')
  }
}
