import type { TransformOptions } from './types'

export function transformUrl(zone: string, sourceUrl: string, options: TransformOptions): string {
  const params = [
    `width=${options.width}`,
    `height=${options.height}`,
    `fit=${options.fit ?? 'scale-down'}`,
    `format=${options.format ?? 'auto'}`,
    `quality=${options.quality ?? 85}`
  ].join(',')

  const cleanZone = zone.replace(/\/$/, '')
  return `${cleanZone}/cdn-cgi/image/${params}/${sourceUrl}`
}

export function avatarUrl(zone: string, sourceUrl: string): string {
  return transformUrl(zone, sourceUrl, {
    width: 600,
    height: 600,
    fit: 'scale-down'
  })
}

export function coverUrl(zone: string, sourceUrl: string): string {
  return transformUrl(zone, sourceUrl, {
    width: 1200,
    height: 400,
    fit: 'cover'
  })
}

export function thumbnailUrl(zone: string, sourceUrl: string): string {
  return transformUrl(zone, sourceUrl, {
    width: 200,
    height: 200,
    fit: 'scale-down'
  })
}
