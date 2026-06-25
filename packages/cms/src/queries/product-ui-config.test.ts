import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getProductUiConfig } from './product-ui-config'
import type { SanityClient } from '@sanity/client'

// Mock database storage for attalabs
const mockThemes: Record<string, any> = {
  'theme-obsidian': { _id: 'theme-obsidian', name: 'Obsidian Theme', dark: { primary: '#000000' } },
  'theme-cyberpunk': { _id: 'theme-cyberpunk', name: 'Cyberpunk Theme', dark: { primary: '#ff00ff' } }
}

const mockLibraries: Record<string, any> = {
  basic: { _id: 'basic', id: 'basic', name: 'Basic Library' },
  brutal: { _id: 'brutal', id: 'brutal', name: 'Brutal Library' }
}

// Mock client implementation for central database (attalabs)
const mockAttalabsFetch = vi.fn((query: string, params: Record<string, any>) => {
  if (query.includes('uiTheme')) {
    return Promise.resolve(mockThemes[params.id] || null)
  }
  if (query.includes('library')) {
    return Promise.resolve(mockLibraries[params.id] || null)
  }
  return Promise.resolve(null)
})

vi.mock('../client', () => {
  return {
    createProductClient: vi.fn(() => ({
      fetch: mockAttalabsFetch
    })),
    PROJECT_IDS: {
      herald: 'e9gbd2d1',
      atta: '892o2m9f',
      vada: 'ofnj2ojb',
      vitakka: 'o56nzgrr',
      attalabs: 'l5n0n8nn'
    }
  }
})

describe('getProductUiConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('correctly resolves string IDs from attalabs central dataset', async () => {
    const mockLocalFetch = vi.fn().mockResolvedValue({
      _id: 'heraldConfig',
      userInterface: {
        theme: 'theme-obsidian',
        colorScheme: 'dark',
        library: 'basic'
      }
    })

    const mockClient = {
      withConfig: vi.fn().mockReturnValue({
        fetch: mockLocalFetch
      })
    } as unknown as SanityClient

    const result = await getProductUiConfig(mockClient, 'heraldConfig', 'heraldConfig')

    expect(mockClient.withConfig).toHaveBeenCalledWith({ useCdn: false })
    expect(mockLocalFetch).toHaveBeenCalledWith(expect.stringContaining('$documentType'), {
      documentType: 'heraldConfig',
      documentId: 'heraldConfig'
    })

    // Check that attalabs was queried for theme-obsidian and basic
    expect(mockAttalabsFetch).toHaveBeenCalledWith(expect.stringContaining('uiTheme'), { id: 'theme-obsidian' })
    expect(mockAttalabsFetch).toHaveBeenCalledWith(expect.stringContaining('library'), { id: 'basic' })

    // Verify reconstruction
    expect(result).toEqual({
      _id: 'heraldConfig',
      userInterface: {
        theme: mockThemes['theme-obsidian'],
        colorScheme: 'dark',
        library: mockLibraries.basic
      }
    })
  })

  it('correctly resolves legacy reference objects from attalabs central dataset', async () => {
    const mockLocalFetch = vi.fn().mockResolvedValue({
      _id: 'heraldConfig',
      userInterface: {
        theme: { _ref: 'theme-cyberpunk', _type: 'reference' },
        colorScheme: 'light',
        library: { _ref: 'brutal', _type: 'reference' }
      }
    })

    const mockClient = {
      withConfig: vi.fn().mockReturnValue({
        fetch: mockLocalFetch
      })
    } as unknown as SanityClient

    const result = await getProductUiConfig(mockClient, 'heraldConfig', 'heraldConfig')

    // Check that attalabs was queried for theme-cyberpunk and brutal
    expect(mockAttalabsFetch).toHaveBeenCalledWith(expect.stringContaining('uiTheme'), { id: 'theme-cyberpunk' })
    expect(mockAttalabsFetch).toHaveBeenCalledWith(expect.stringContaining('library'), { id: 'brutal' })

    // Verify reconstruction
    expect(result).toEqual({
      _id: 'heraldConfig',
      userInterface: {
        theme: mockThemes['theme-cyberpunk'],
        colorScheme: 'light',
        library: mockLibraries.brutal
      }
    })
  })

  it('sets theme and library to null when resolution fails (preventing silent fallback regressions)', async () => {
    const mockLocalFetch = vi.fn().mockResolvedValue({
      _id: 'heraldConfig',
      userInterface: {
        theme: 'non-existent-theme',
        colorScheme: 'dark',
        library: 'non-existent-library'
      }
    })

    const mockClient = {
      withConfig: vi.fn().mockReturnValue({
        fetch: mockLocalFetch
      })
    } as unknown as SanityClient

    const result = await getProductUiConfig(mockClient, 'heraldConfig', 'heraldConfig')

    // Verify reconstruction with null values instead of leaving them as unresolvable string IDs
    expect(result).toEqual({
      _id: 'heraldConfig',
      userInterface: {
        theme: null,
        colorScheme: 'dark',
        library: null
      }
    })
  })

  it('returns immediately if config or userInterface config does not exist', async () => {
    const mockLocalFetch = vi.fn().mockResolvedValue(null)
    const mockClient = {
      withConfig: vi.fn().mockReturnValue({
        fetch: mockLocalFetch
      })
    } as unknown as SanityClient

    const result = await getProductUiConfig(mockClient, 'heraldConfig', 'heraldConfig')
    expect(result).toBeNull()
    expect(mockAttalabsFetch).not.toHaveBeenCalled()
  })
})
