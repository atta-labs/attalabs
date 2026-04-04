#!/usr/bin/env node

/**
 * Validate that all UI libraries export the required components and types.
 * Usage: node packages/ui/scripts/validate-ui-contract.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uiRoot = resolve(__dirname, '..')

const { REQUIRED_COMPONENTS, REQUIRED_TYPES, TEMPLATES } = await import(
  join(uiRoot, 'component-contract.mjs')
)

function parseExports(filePath, visited = new Set()) {
  if (visited.has(filePath)) return { components: new Set(), types: new Set() }
  visited.add(filePath)

  const components = new Set()
  const types = new Set()

  let content
  const tryPaths = [filePath, `${filePath}.ts`, `${filePath}.tsx`, `${filePath}/index.ts`, `${filePath}/index.tsx`]
  for (const p of tryPaths) {
    try {
      content = readFileSync(p, 'utf-8')
      break
    } catch {}
  }

  if (!content) return { components, types }

  // Match: export { A, B, type C } from '...'
  const exportFromRegex = /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = exportFromRegex.exec(content)) !== null) {
    const isTypeOnly = match[0].startsWith('export type')
    const names = match[1].split(',').map((s) => s.trim()).filter(Boolean)
    for (const name of names) {
      const cleanName = name.replace(/\s+as\s+\w+/, '').trim()
      if (isTypeOnly || cleanName.startsWith('type ')) {
        types.add(cleanName.replace(/^type\s+/, ''))
      } else {
        components.add(cleanName)
      }
    }
  }

  // Match: export * from '...'
  const starRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g
  while ((match = starRegex.exec(content)) !== null) {
    const importPath = match[1]
    let resolved
    if (importPath.startsWith('.')) {
      resolved = resolve(dirname(filePath), importPath)
    } else if (importPath.startsWith('@herald/ui/')) {
      resolved = resolve(uiRoot, importPath.replace('@herald/ui/', ''))
    }
    if (resolved) {
      const sub = parseExports(resolved, visited)
      for (const c of sub.components) components.add(c)
      for (const t of sub.types) types.add(t)
    }
  }

  // Match: export type * from '...'
  const typeStarRegex = /export\s+type\s+\*\s+from\s+['"]([^'"]+)['"]/g
  while ((match = typeStarRegex.exec(content)) !== null) {
    const importPath = match[1]
    let resolved
    if (importPath.startsWith('.')) {
      resolved = resolve(dirname(filePath), importPath)
    } else if (importPath.startsWith('@herald/ui/')) {
      resolved = resolve(uiRoot, importPath.replace('@herald/ui/', ''))
    }
    if (resolved) {
      const sub = parseExports(resolved, visited)
      for (const t of sub.types) types.add(t)
      // type * also captures component-like exports as types
      for (const c of sub.components) types.add(c)
    }
  }

  return { components, types }
}

function validateTemplate(template) {
  const indexPath = resolve(uiRoot, `libraries/${template}/components/index.ts`)
  const { components, types } = parseExports(indexPath)

  const missingComponents = REQUIRED_COMPONENTS.filter((c) => !components.has(c))
  const missingTypes = REQUIRED_TYPES.filter((t) => !types.has(t))

  return { template, missingComponents, missingTypes, valid: missingComponents.length === 0 && missingTypes.length === 0 }
}

// Main
console.log('\n🔍 Validating UI Component Contract\n')
console.log(`   Contract: ${REQUIRED_COMPONENTS.length} components, ${REQUIRED_TYPES.length} types`)
console.log(`   Templates: ${TEMPLATES.join(', ')}\n`)

let allValid = true

for (const template of TEMPLATES) {
  const result = validateTemplate(template)

  if (result.valid) {
    console.log(`📦 ${template}: ✅ All exports present`)
  } else {
    allValid = false
    console.log(`📦 ${template}: ❌ Missing exports`)
    if (result.missingComponents.length > 0) {
      console.log(`   Components (${result.missingComponents.length}):`)
      for (const c of result.missingComponents) console.log(`     - ${c}`)
    }
    if (result.missingTypes.length > 0) {
      console.log(`   Types (${result.missingTypes.length}):`)
      for (const t of result.missingTypes) console.log(`     - ${t}`)
    }
  }
}

console.log('')
process.exit(allValid ? 0 : 1)
