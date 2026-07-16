import { getProductBranding } from '@atta/cms'
import type { CMSBranding } from '@atta/cms'

export async function fetchVadaBranding(): Promise<CMSBranding | null> {
  return getProductBranding('vada').catch(() => null)
}
