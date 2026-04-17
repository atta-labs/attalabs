import type { RouteProvider } from './providers'

const LS_PREFIX = 'vada:model-key:'

function storageKey(route: RouteProvider): string {
  return `${LS_PREFIX}${route}`
}

export function getStoredApiKey(route: RouteProvider): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(storageKey(route))
  } catch {
    return null
  }
}

export function storeApiKey(route: RouteProvider, key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(route), key)
  } catch {
    // Storage full or disabled — silently no-op
  }
}

export function removeStoredApiKey(route: RouteProvider): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey(route))
  } catch {
    // silently no-op
  }
}
