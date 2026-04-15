import { cmsClient, getVadaBranding } from '@atta/cms'
import type { CMSBranding } from '@atta/cms'

export async function fetchVadaBranding(): Promise<CMSBranding | null> {
  return getVadaBranding(cmsClient).catch(() => null)
}
