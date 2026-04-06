# Cloudflare R2 Storage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `@atta/storage`, a shared monorepo package that provides R2 file upload, deletion, and Cloudflare Image Transformation URL building for all Atta AI apps.

**Architecture:** S3-compatible client (`@aws-sdk/client-s3`) connecting to Cloudflare R2. Single `atta` bucket with `{product}/{environment}/{type}/{filename}` key structure. URL-based Cloudflare Image Transformations for resizing. Follows existing `@atta/db` package conventions (factory pattern, no shared state, env-driven config).

**Tech Stack:** `@aws-sdk/client-s3`, TypeScript, Turborepo workspace package

**Spec:** `docs/superpowers/specs/2026-04-06-cloudflare-r2-storage-design.md`

---

## File Structure

```
packages/storage/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # Public exports
    ├── types.ts        # All types and interfaces
    ├── client.ts       # R2 S3Client factory
    ├── upload.ts       # upload(), remove(), getPublicUrl()
    └── transform.ts    # Cloudflare Image Transformation URL builder
```

---

### Task 1: Scaffold `@atta/storage` package

**Files:**
- Create: `packages/storage/package.json`
- Create: `packages/storage/tsconfig.json`
- Create: `packages/storage/src/index.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@atta/storage",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./transform": "./src/transform.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.800.0"
  },
  "devDependencies": {
    "@atta/typescript-config": "workspace:*",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "extends": "@atta/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create placeholder `src/index.ts`**

```ts
// @atta/storage — Cloudflare R2 storage client
// Implementation added in subsequent tasks
```

- [ ] **Step 4: Install dependencies**

Run: `bun install`
Expected: Resolves workspace, installs `@aws-sdk/client-s3`

- [ ] **Step 5: Verify typecheck**

Run: `bun run typecheck --filter=@atta/storage`
Expected: PASS (empty module, no errors)

- [ ] **Step 6: Commit**

```bash
git add packages/storage/
git commit -m "Feat: scaffold @atta/storage package"
```

---

### Task 2: Define types

**Files:**
- Create: `packages/storage/src/types.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
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
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck --filter=@atta/storage`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/storage/src/types.ts
git commit -m "Feat: add @atta/storage type definitions"
```

---

### Task 3: Implement R2 client factory

**Files:**
- Create: `packages/storage/src/client.ts`

- [ ] **Step 1: Create `client.ts`**

```ts
import { S3Client } from '@aws-sdk/client-s3'
import type { StorageConfig } from './types'

let cachedClient: S3Client | null = null
let cachedConfigKey = ''

function configKey(config: StorageConfig): string {
  return `${config.accountId}:${config.bucketName}`
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
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck --filter=@atta/storage`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/storage/src/client.ts
git commit -m "Feat: add R2 S3-compatible client factory"
```

---

### Task 4: Implement upload, remove, getPublicUrl

**Files:**
- Create: `packages/storage/src/upload.ts`

- [ ] **Step 1: Create `upload.ts`**

```ts
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
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck --filter=@atta/storage`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/storage/src/upload.ts
git commit -m "Feat: add upload, remove, getPublicUrl to @atta/storage"
```

---

### Task 5: Implement image transformation URL builder

**Files:**
- Create: `packages/storage/src/transform.ts`

- [ ] **Step 1: Create `transform.ts`**

```ts
import type { TransformOptions } from './types'

export function transformUrl(
  zone: string,
  sourceUrl: string,
  options: TransformOptions,
): string {
  const params = [
    `width=${options.width}`,
    `height=${options.height}`,
    `fit=${options.fit ?? 'scale-down'}`,
    `format=${options.format ?? 'auto'}`,
    `quality=${options.quality ?? 85}`,
  ].join(',')

  const cleanZone = zone.replace(/\/$/, '')
  return `${cleanZone}/cdn-cgi/image/${params}/${sourceUrl}`
}

export function avatarUrl(zone: string, sourceUrl: string): string {
  return transformUrl(zone, sourceUrl, {
    width: 600,
    height: 600,
    fit: 'scale-down',
  })
}

export function coverUrl(zone: string, sourceUrl: string): string {
  return transformUrl(zone, sourceUrl, {
    width: 1200,
    height: 400,
    fit: 'cover',
  })
}

export function thumbnailUrl(zone: string, sourceUrl: string): string {
  return transformUrl(zone, sourceUrl, {
    width: 200,
    height: 200,
    fit: 'scale-down',
  })
}
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck --filter=@atta/storage`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/storage/src/transform.ts
git commit -m "Feat: add Cloudflare Image Transformation URL builder"
```

---

### Task 6: Wire up public exports

**Files:**
- Modify: `packages/storage/src/index.ts`

- [ ] **Step 1: Replace `src/index.ts` with final exports**

```ts
export { createStorageClient } from './client'
export { upload, remove, getPublicUrl } from './upload'
export type {
  Environment,
  ImageType,
  Product,
  StorageConfig,
  TransformOptions,
  UploadOptions,
  UploadResult,
} from './types'
```

- [ ] **Step 2: Verify typecheck passes for @atta/storage**

Run: `bun run typecheck --filter=@atta/storage`
Expected: PASS

- [ ] **Step 3: Verify full monorepo typecheck is not broken**

Run: `bun run typecheck`
Expected: All packages pass (pre-existing `@atta/cms` errors are unrelated)

- [ ] **Step 4: Commit**

```bash
git add packages/storage/src/index.ts
git commit -m "Feat: wire up @atta/storage public exports"
```

---

### Task 7: Add CLAUDE.md for the package

**Files:**
- Create: `packages/storage/CLAUDE.md`

- [ ] **Step 1: Create `CLAUDE.md`**

```markdown
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

## Environment Variables (per app)

```
CLOUDFLARE_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=atta
R2_PUBLIC_URL=https://storage.atta.ai
```
```

- [ ] **Step 2: Commit**

```bash
git add packages/storage/CLAUDE.md
git commit -m "Docs: add CLAUDE.md for @atta/storage"
```

---

### Task 8: Update root CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (root)

- [ ] **Step 1: Add `@atta/storage` to the Shared Packages table**

Add this row to the `## Shared Packages` table in root `CLAUDE.md`:

```markdown
| @atta/storage | [packages/storage/](packages/storage/) | [CLAUDE.md](packages/storage/CLAUDE.md) | — | Cloudflare R2 storage client + image transforms |
```

Add it after the `@atta/cms` row.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: add @atta/storage to monorepo package index"
```
