import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createStorageClient } from './client'
import type { StorageConfig, UploadOptions, UploadResult } from './types'

function buildKey(options: UploadOptions): string {
  const id = crypto.randomUUID()
  const sanitized = options.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${options.product}/${options.environment}/${options.type}/${id}-${sanitized}`
}

export function getPublicUrl(config: StorageConfig, key: string): string {
  const base = config.publicUrl.replace(/\/$/, '')
  return `${base}/${key}`
}

export async function upload(
  config: StorageConfig,
  options: UploadOptions,
): Promise<UploadResult> {
  const client = createStorageClient(config)
  const key = buildKey(options)

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: options.body,
    ContentType: options.contentType,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: {
      originalFilename: options.filename,
      uploadDate: new Date().toISOString(),
      ...options.metadata,
    },
  })

  await client.send(command)

  return {
    key,
    url: getPublicUrl(config, key),
  }
}

export async function remove(config: StorageConfig, key: string): Promise<void> {
  const client = createStorageClient(config)

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  await client.send(command)
}
