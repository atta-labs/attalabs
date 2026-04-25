import { createHash } from 'node:crypto'

export function hashQuestion(question: string): string {
  return createHash('sha256').update(question.toLowerCase().trim().replace(/\s+/g, ' ')).digest('hex').slice(0, 32)
}
