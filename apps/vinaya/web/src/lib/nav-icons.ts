import { BookOpen, FileText, FolderKanban, GitBranch, LayoutDashboard, LayoutList, ListTodo } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  'all-projects': FolderKanban,
  'all-iterations': LayoutList,
  graph: GitBranch,
  docs: BookOpen,
  overview: LayoutDashboard,
  projects: FolderKanban,
  iterations: LayoutList,
  backlog: ListTodo
}

const FALLBACK_ICON: LucideIcon = FileText

export function getAegNavIcon(slug: string): LucideIcon {
  return ICON_MAP[slug] ?? FALLBACK_ICON
}
