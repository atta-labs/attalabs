#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  '.turbo',
  '.git',
  '.worktrees',
  'superpowers',
]);

// Root docs to index (in repo root only)
const ROOT_DOC_NAMES = new Set(['CLAUDE.md', 'DOCS.md', 'ROADMAP.md', 'README.md']);

async function readDir(dir) {
  try {
    return await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function parseFrontMatter(content) {
  const result = {};

  if (content.startsWith('---\n')) {
    const endIdx = content.indexOf('\n---\n', 4);
    if (endIdx > 0) {
      const fm = content.substring(4, endIdx);
      const lines = fm.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          result[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
        }
      }
    }
  }

  return result;
}

function parseSkillTitle(content) {
  const fm = parseFrontMatter(content);

  // MUST have description field in front matter
  if (fm.description) return fm.description;

  // No fallback — fail if missing
  return null;
}

function parseSpecTitle(content) {
  // MUST have first H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();

  // No fallback — fail if missing
  return null;
}

async function walkDir(dir, relativeBase = '') {
  const files = {
    skills: [],
    specs: {}, // app -> { regular: [], legacy: [] }
    rootDocs: [],
  };

  const errors = [];

  async function walk(currentDir, currentRel) {
    const entries = await readDir(currentDir);

    for (const entry of entries) {
      // Skip reserved directories
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      const relPath = currentRel ? path.join(currentRel, entry.name) : entry.name;

      if (entry.isDirectory()) {
        await walk(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = await fs.promises.readFile(fullPath, 'utf-8');

        // Check if it's a skill (`.claude/skills/*/SKILL.md`)
        if (
          relPath.startsWith('.claude/skills/') &&
          entry.name === 'SKILL.md'
        ) {
          const title = parseSkillTitle(content);
          if (!title) {
            errors.push(`ERROR: missing description in ${relPath}`);
            continue;
          }
          files.skills.push({
            path: relPath,
            title,
          });
        }

        // Check if it's a spec (`apps/*/specs/**/*.md`)
        if (relPath.startsWith('apps/') && relPath.includes('/specs/')) {
          const match = relPath.match(/^apps\/([^/]+)\/specs\/(.+\.md)$/);
          if (match) {
            const appName = match[1];
            const specPath = match[2];
            const isLegacy = specPath.startsWith('legacy/');

            const title = parseSpecTitle(content);
            if (!title) {
              errors.push(`ERROR: missing H1 in ${relPath}`);
              continue;
            }

            if (!files.specs[appName]) {
              files.specs[appName] = { regular: [], legacy: [] };
            }

            const category = isLegacy ? 'legacy' : 'regular';

            files.specs[appName][category].push({
              path: relPath,
              title,
            });
          }
        }

        // Check if it's a root doc (must be in repo root exactly)
        if (
          currentRel === '' &&
          ROOT_DOC_NAMES.has(entry.name)
        ) {
          const title = parseSpecTitle(content);
          if (!title) {
            errors.push(`ERROR: missing H1 in ${relPath}`);
            continue;
          }
          files.rootDocs.push({
            path: entry.name,
            title,
          });
        }
      }
    }
  }

  await walk(dir, relativeBase);
  return { files, errors };
}

async function generateDocsIndex(files) {
  let output = '# Atta Monorepo — Documentation Index\n\n';

  // Skills
  if (files.skills.length > 0) {
    output += '## Skills\n\n';
    for (const skill of files.skills.sort((a, b) => a.path.localeCompare(b.path))) {
      output += `- [${skill.title}](./${skill.path})\n`;
    }
    output += '\n';
  }

  // Specs by app
  const apps = Object.keys(files.specs).sort();
  if (apps.length > 0) {
    output += '## Specification Documents\n\n';

    for (const app of apps) {
      const { regular, legacy } = files.specs[app];

      // Output app section if there are regular specs or legacy specs
      if (regular.length > 0 || legacy.length > 0) {
        output += `### ${app}\n\n`;

        // Regular specs section
        if (regular.length > 0) {
          for (const spec of regular.sort((a, b) => a.path.localeCompare(b.path))) {
            output += `- [${spec.title}](./${spec.path})\n`;
          }
          output += '\n';
        }

        // Archived specs section
        if (legacy.length > 0) {
          output += '#### Archived\n\n';
          for (const spec of legacy.sort((a, b) => a.path.localeCompare(b.path))) {
            output += `- [${spec.title}](./${spec.path})\n`;
          }
          output += '\n';
        }
      }
    }
  }

  // Root docs
  if (files.rootDocs.length > 0) {
    output += '## Root-Level Documentation\n\n';
    for (const doc of files.rootDocs.sort((a, b) => a.path.localeCompare(b.path))) {
      output += `- [${doc.title}](./${doc.path})\n`;
    }
    output += '\n';
  }

  return output;
}

async function main() {
  try {
    console.log('🔍 Indexing documentation...');
    const { files, errors } = await walkDir(projectRoot);

    // Fail if there are any validation errors
    if (errors.length > 0) {
      for (const error of errors) {
        console.error(error);
      }
      process.exit(1);
    }

    const index = await generateDocsIndex(files);
    const indexPath = path.join(projectRoot, 'docs-index.md');
    await fs.promises.writeFile(indexPath, index, 'utf-8');

    // Print summary
    console.log(`✅ Documentation index generated: docs-index.md`);
    console.log(`   Root Docs: ${files.rootDocs.length}`);
    console.log(`   Skills: ${files.skills.length}`);

    let totalSpecs = 0;
    for (const app of Object.keys(files.specs).sort()) {
      const { regular, legacy } = files.specs[app];
      const total = regular.length + legacy.length;
      if (total > 0) {
        console.log(`   ${app}: ${regular.length} specs, ${legacy.length} archived`);
      }
      totalSpecs += total;
    }

    const total = files.rootDocs.length + files.skills.length + totalSpecs;
    console.log(`   Total: ${total} files indexed`);
  } catch (error) {
    console.error('❌ Error generating documentation index:', error.message);
    process.exit(1);
  }
}

main();
