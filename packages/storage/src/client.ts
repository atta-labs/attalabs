import { S3Client } from '@aws-sdk/client-s3'
import type { StorageConfig } from './types'

let cachedClient: S3Client | null = null
let cachedConfigKey = ''

function configKey(config: StorageConfig): string {
  return `${config.accountId}:${config.bucketName}:${config.accessKeyId}`
}

export function createStorageClient(config: StorageConfig): S3Client {
  const key = configKey(config)
  if (cachedClient && cachedConfigKey === key) {
    return cachedClient
  }

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  cachedConfigKey = key

  return cachedClient
}
