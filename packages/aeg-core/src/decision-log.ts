/**
 * Decision-log shape and numbering checks (C1/C2/F1/F2/N1/N2). Pure — takes file
 * content as a string, returns findings. No filesystem, no git.
 */

export function hasStatusBlock(content: string): boolean {
  return /(^|\n)\s*(\*\*)?Status:?(\*\*)?\s*:?\s*(draft|target|ratified|retired)/i.test(content)
}
