import {
  BadgeCheck,
  Bot,
  Braces,
  Compass,
  FileCheck,
  FlaskConical,
  GitMerge,
  Hand,
  Info,
  Layers3,
  Library,
  Network,
  Palette,
  RefreshCw,
  ShieldAlert,
  Target,
  Timer,
  TrendingUp,
  TreePine,
  UserMinus,
  Users
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ScienceNavItem = {
  slug: string
  href: string
  label: string
  eyebrow?: string
  icon: LucideIcon
}

export type ScienceNavGroup = {
  id: string
  label: string
  items: ScienceNavItem[]
}

export const SCIENCE_NAV: ScienceNavGroup[] = [
  {
    id: 'intro',
    label: 'The Science of Vāda',
    items: [
      { slug: 'overview', href: '/science/overview', label: 'Overview', eyebrow: 'Fundamental Theory', icon: Info },
      {
        slug: 'boardroom',
        href: '/science/boardroom',
        label: 'The Boardroom, Not the Factory',
        eyebrow: 'Metaphor',
        icon: Library
      }
    ]
  },
  {
    id: 'foundations',
    label: 'Foundations',
    items: [
      {
        slug: 'persona-collapse',
        href: '/science/persona-collapse',
        label: 'Persona Collapse',
        eyebrow: 'Foundations',
        icon: UserMinus
      },
      {
        slug: 'cognitive-quarantine',
        href: '/science/cognitive-quarantine',
        label: 'Cognitive Quarantine',
        eyebrow: 'Foundations',
        icon: ShieldAlert
      },
      {
        slug: 'dialectic',
        href: '/science/dialectic',
        label: 'The Hegelian Dialectic',
        eyebrow: 'Foundations',
        icon: GitMerge
      },
      {
        slug: 'thinking-hats',
        href: '/science/thinking-hats',
        label: 'Six Thinking Hats',
        eyebrow: 'Foundations',
        icon: Palette
      },
      {
        slug: 'red-teaming',
        href: '/science/red-teaming',
        label: 'Military Red Teaming',
        eyebrow: 'Foundations',
        icon: Target
      },
      { slug: 'belbin', href: '/science/belbin', label: 'Belbin Team Roles', eyebrow: 'Foundations', icon: Users },
      {
        slug: 'cognitive-diversity',
        href: '/science/cognitive-diversity',
        label: 'Architectural Cognitive Diversity',
        eyebrow: 'Foundations',
        icon: Network
      }
    ]
  },
  {
    id: 'architecture',
    label: 'Architecture',
    items: [
      {
        slug: 'rounds',
        href: '/science/rounds',
        label: 'The Three Rounds',
        eyebrow: 'Architecture',
        icon: RefreshCw
      },
      { slug: 'agents', href: '/science/agents', label: 'The Six Agents', eyebrow: 'Architecture', icon: Bot },
      {
        slug: 'conclusion',
        href: '/science/conclusion',
        label: 'The Conclusion Protocol',
        eyebrow: 'Architecture',
        icon: FileCheck
      },
      {
        slug: 'interventions',
        href: '/science/interventions',
        label: 'Principal Interventions',
        eyebrow: 'Architecture',
        icon: Hand
      },
      {
        slug: 'context',
        href: '/science/context',
        label: 'Context Depth vs. Freshness',
        eyebrow: 'Architecture',
        icon: Layers3
      }
    ]
  },
  {
    id: 'engine',
    label: 'Engine',
    items: [
      { slug: 'lifecycle', href: '/science/lifecycle', label: 'Session Lifecycle', eyebrow: 'Engine', icon: Timer },
      {
        slug: 'json-paradox',
        href: '/science/json-paradox',
        label: 'The JSON Paradox',
        eyebrow: 'Engine',
        icon: Braces
      }
    ]
  },
  {
    id: 'validation',
    label: 'Validation',
    items: [
      {
        slug: 'test-cases',
        href: '/science/test-cases',
        label: 'The Five Test Cases',
        eyebrow: 'Validation',
        icon: FlaskConical
      },
      {
        slug: 'weak-to-strong',
        href: '/science/weak-to-strong',
        label: 'Weak-to-Strong Generalization',
        eyebrow: 'Validation',
        icon: TrendingUp
      },
      {
        slug: 'what-we-proved',
        href: '/science/what-we-proved',
        label: 'What We Proved',
        eyebrow: 'Validation',
        icon: BadgeCheck
      }
    ]
  },
  {
    id: 'ecosystem',
    label: 'Ecosystem',
    items: [
      {
        slug: 'ecosystem',
        href: '/science/ecosystem',
        label: 'Vāda, Vitakka, and Attā',
        eyebrow: 'Ecosystem',
        icon: Compass
      },
      {
        slug: 'pedigree',
        href: '/science/pedigree',
        label: 'Pedigree of Thought',
        eyebrow: 'Ecosystem',
        icon: TreePine
      }
    ]
  }
]

export const SCIENCE_NAV_FLAT: ScienceNavItem[] = SCIENCE_NAV.flatMap((g) => g.items)

export function getScienceNavItem(slug: string): ScienceNavItem | undefined {
  return SCIENCE_NAV_FLAT.find((item) => item.slug === slug)
}

export function getNextScienceNavItem(slug: string): ScienceNavItem | undefined {
  const idx = SCIENCE_NAV_FLAT.findIndex((item) => item.slug === slug)
  if (idx === -1 || idx === SCIENCE_NAV_FLAT.length - 1) return undefined
  return SCIENCE_NAV_FLAT[idx + 1]
}

export function getPrevScienceNavItem(slug: string): ScienceNavItem | undefined {
  const idx = SCIENCE_NAV_FLAT.findIndex((item) => item.slug === slug)
  if (idx <= 0) return undefined
  return SCIENCE_NAV_FLAT[idx - 1]
}
