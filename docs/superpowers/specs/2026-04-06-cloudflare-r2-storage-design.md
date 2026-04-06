# Cloudflare R2 Storage — Design Spec

**Date:** 2026-04-06
**Status:** Approved
**Scope:** Monorepo-wide shared storage infrastructure

---

## Overview

Add Cloudflare R2 as the shared file storage layer for all Atta AI products. Accessed via S3-compatible API from Vercel-deployed Next.js apps. Cloudflare Image Transformations for on-the-fly resizing/formatting. Abstracted into a shared `@atta/storage` package.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage provider | Cloudflare R2 | Multi-app ecosystem needs cheap storage with free egress. Future Cloudflare migration path. |
| Access method | S3-compatible API (`@aws-sdk/client-s3`) | Apps deploy on Vercel today. Native R2 bindings require Cloudflare Pages. Swap later. |
| Image transforms | Cloudflare Image Transformations (URL-based) | No binding needed. Works from any origin. |
| Package structure | Shared `@atta/storage` package | 4 apps will need uploads. Avoid duplicating R2 logic inline (breaks from Summon's per-app pattern, justified by app count). |
| Bucket strategy | Single `atta` bucket, product prefix in key path | Mirrors Summon's single-bucket model. Simple IAM, one token. |

## 1. Cloudflare Account & R2 Setup

Manual steps (user):

1. Create Cloudflare account at cloudflare.com
2. Enable R2 (free tier: 10GB storage, 10M reads/month)
3. Create bucket: `atta`
4. Enable public access on the bucket
5. Create R2 API token (S3-compatible) with read/write permissions
6. Optional: custom domain for bucket (e.g. `storage.atta.ai`)
7. Optional: enable Cloudflare Image Transformations on the zone (requires domain on Cloudflare)

Environment variables produced:

```
CLOUDFLARE_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=atta
R2_PUBLIC_URL=https://storage.atta.ai  # or the r2.dev URL
```

## 2. `@atta/storage` Package

Location: `packages/storage/`

```
packages/storage/
├── package.json          # @atta/storage
├── src/
│   ├── index.ts          # Public API exports
│   ├── client.ts         # R2 client factory (S3-compatible)
│   ├── upload.ts         # upload(), remove(), getPublicUrl()
│   ├── transform.ts      # Cloudflare Image Transformation URL builder
│   └── types.ts          # Product, ImageType, Environment, UploadOptions
└── tsconfig.json
```

### Dependencies

- `@aws-sdk/client-s3` — S3-compatible R2 access
- `@aws-sdk/s3-request-presigner` — presigned URLs (future use)

### Types (`types.ts`)

```ts
type Product = 'herald' | 'vitakka' | 'vada' | 'atta'
type ImageType = 'avatars' | 'covers' | 'assets'
type Environment = 'development' | 'staging' | 'production'

interface UploadOptions {
  product: Product
  environment: Environment
  type: ImageType
  filename: string
  body: Buffer | ReadableStream | Blob
  contentType: string
  metadata?: Record<string, string>
}

interface UploadResult {
  key: string
  url: string
}

interface StorageConfig {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl: string
}
```

### Client (`client.ts`)

- Creates `S3Client` pointed at `https://{accountId}.r2.cloudflarestorage.com`
- Configured via `StorageConfig`
- Singleton pattern per app instance

### Upload (`upload.ts`)

- `upload(config, options)` → `UploadResult` (key + public URL)
- `remove(config, key)` → void
- `getPublicUrl(config, key)` → string
- Key format: `{product}/{environment}/{type}/{uuid}-{filename}`
- Unique filenames via `crypto.randomUUID()`
- Cache-Control: `public, max-age=31536000, immutable` (Summon pattern)
- Metadata stored on R2 object: `uploadedBy`, `originalFilename`, `uploadDate`

### Transform (`transform.ts`)

Builds Cloudflare Image Transformation URLs:

```
https://{zone}/cdn-cgi/image/{params}/{sourceUrl}
```

Presets:
- `avatar(url)` → 600x600, fit: scale-down, format: auto, quality: 85
- `cover(url)` → 1200x400, fit: cover, format: auto, quality: 85
- `thumbnail(url)` → 200x200, fit: scale-down, format: auto, quality: 85
- `custom(url, options)` → arbitrary width/height/fit/format/quality

## 3. App Integration Pattern

Each app creates a thin upload API route that calls `@atta/storage`.

### Route pattern: `src/app/api/images/upload/route.ts`

- POST handler: receives FormData with file
- Validates: Clerk auth, file size (max 5MB), file type (image/*)
- Calls `@atta/storage` upload with the app's product name
- Returns `{ url, key }` as JSON

### Environment variables (per app `.env.local`)

```
CLOUDFLARE_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=atta
R2_PUBLIC_URL=https://storage.atta.ai
```

Same credentials across all apps. Differentiated by product prefix in key path.

### Next.js config (per app)

Add storage domain to `remotePatterns`:

```ts
images: {
  remotePatterns: [
    { hostname: 'storage.atta.ai' },
  ]
}
```

## 4. R2 Bucket Key Structure

```
atta (bucket)
├── herald/
│   ├── development/
│   │   ├── avatars/
│   │   ├── covers/
│   │   └── assets/
│   ├── staging/
│   └── production/
├── vitakka/
│   ├── development/
│   ├── staging/
│   └── production/
├── vada/
│   └── ...
└── atta/
    └── ...
```

## 5. Out of Scope

- Wrangler / Workers setup (apps stay on Vercel)
- Cloudflare KV, Workers AI, OpenNext
- Deployment migration from Vercel to Cloudflare Pages
- Upload UI components (per-app concern, separate task)
- Presigned upload URLs (available via `@aws-sdk/s3-request-presigner` but not needed yet)
