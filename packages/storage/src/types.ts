export type Product = 'herald' | 'vitakka' | 'vada' | 'atta'

export type ImageType = 'avatars' | 'covers' | 'assets'

export type Environment = 'development' | 'staging' | 'production'

export interface StorageConfig {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl: string
}

export interface UploadOptions {
  product: Product
  environment: Environment
  type: ImageType
  filename: string
  body: Buffer | ReadableStream | Blob
  contentType: string
  metadata?: Record<string, string>
}

export interface UploadResult {
  key: string
  url: string
}

export interface TransformOptions {
  width: number
  height: number
  fit?: 'scale-down' | 'cover' | 'contain' | 'crop'
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png'
  quality?: number
}
