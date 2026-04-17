import {
  BadgeCheck,
  Bot,
  Braces,
  Compass,
  FileCheck,
  FileText,
  FlaskConical,
  GitMerge,
  Hand,
  Info,
  Layers3,
  Library,
  Network,
  Palette,
  RefreshCw,
  Shield,
  ShieldAlert,
  Target,
  Timer,
  TrendingUp,
  TreePine,
  UserMinus,
  Users
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  overview: Info,
  boardroom: Library,
  'persona-collapse': UserMinus,
  'cognitive-quarantine': ShieldAlert,
  dialectic: GitMerge,
  'thinking-hats': Palette,
  'red-teaming': Target,
  belbin: Users,
  'cognitive-diversity': Network,
  rounds: RefreshCw,
  agents: Bot,
  conclusion: FileCheck,
  interventions: Hand,
  context: Layers3,
  'anti-drift': Shield,
  'prompt-library': FileText,
  lifecycle: Timer,
  'json-paradox': Braces,
  'test-cases': FlaskConical,
  'weak-to-strong': TrendingUp,
  'what-we-proved': BadgeCheck,
  ecosystem: Compass,
  pedigree: TreePine
}

const FALLBACK_ICON: LucideIcon = FileText

export function getScienceIcon(slug: string): LucideIcon {
  return ICON_MAP[slug] ?? FALLBACK_ICON
}
