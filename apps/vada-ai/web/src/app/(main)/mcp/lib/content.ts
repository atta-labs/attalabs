import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const CONTENT_PATH = path.join(process.cwd(), 'content', 'mcp', 'index.md')

type McpContent = {
  title: string
  description: string
  section: string
  content: string
}

export async function getMcpContent(): Promise<McpContent> {
  const raw = await fs.readFile(CONTENT_PATH, 'utf8')
  const { data, content } = matter(raw)
  return {
    title: data.title as string,
    description: data.description as string,
    section: data.section as string,
    content
  }
}
