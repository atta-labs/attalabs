import { describe, expect, it, vi } from 'vitest'

// `server-only` throws unconditionally on plain import — Next's bundler
// rewrites it, a test runner does not. Stubbing it is what lets the module
// (which must keep that import) be exercised here.
vi.mock('server-only', () => ({}))

const getProductCms = vi.fn()
vi.mock('@atta/cms', () => ({ getProductCms: (...args: unknown[]) => getProductCms(...args) }))

const { fetchPortalCms } = await import('./portal-cms')

describe('fetchPortalCms', () => {
  it("delegates to getProductCms('vinayaPortal')", async () => {
    const cms = { config: null, branding: null }
    getProductCms.mockResolvedValue(cms)

    const result = await fetchPortalCms()

    expect(getProductCms).toHaveBeenCalledWith('vinayaPortal')
    expect(result).toBe(cms)
  })
})
