const PREFIX = 'vada:apikey:'

export function getStoredApiKey(provider: string): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(`${PREFIX}${provider}`) ?? ''
}

export function storeApiKey(provider: string, apiKey: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${PREFIX}${provider}`, apiKey)
}

export function clearApiKey(provider: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`${PREFIX}${provider}`)
}
