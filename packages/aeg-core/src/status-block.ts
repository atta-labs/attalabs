/**
 * Spec status-block check (C1/F1). Pure — takes file
 * content as a string, returns findings. No filesystem, no git.
 */

export function hasStatusBlock(content: string): boolean {
  return /(^|\n)\s*(\*\*)?Status:?(\*\*)?\s*:?\s*(draft|target|ratified|retired)/i.test(content)
}
