# @atta/storage — Shared Storage

Cloudflare R2 storage client for the Atta AI ecosystem. Provides file upload, deletion, and Cloudflare Image Transformation URL building.

## Usage

```typescript
import { upload, remove, getPublicUrl } from '@atta/storage'
import type { StorageConfig } from '@atta/storage'

const config: StorageConfig = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucketName: process.env.R2_BUCKET_NAME!,
  publicUrl: process.env.R2_PUBLIC_URL!,
}

const result = await upload(config, {
  product: 'herald',
  environment: 'production',
  type: 'avatars',
  filename: 'photo.jpg',
  body: fileBuffer,
  contentType: 'image/jpeg',
})
// result.url → https://storage.atta.ai/herald/production/avatars/uuid-photo.jpg
```

## Image Transformations

```typescript
import { avatarUrl, coverUrl, thumbnailUrl } from '@atta/storage/transform'

avatarUrl('https://atta.ai', sourceUrl)   // 600x600 scale-down
coverUrl('https://atta.ai', sourceUrl)    // 1200x400 cover
thumbnailUrl('https://atta.ai', sourceUrl) // 200x200 scale-down
```

## Key Rules

- Single R2 bucket `atta`, differentiated by `{product}/{environment}/{type}/` key prefix
- All apps share the same R2 credentials
- S3-compatible API via `@aws-sdk/client-s3` (works on Vercel, swap to native bindings when moving to Cloudflare Pages)
- Cache-Control: `public, max-age=31536000, immutable`
- `upload()` and `remove()` throw on failure — callers must handle errors

## Environment Variables (per app)

```
CLOUDFLARE_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=atta
R2_PUBLIC_URL=https://storage.atta.ai
```
