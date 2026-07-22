import { ArrowDown, ClipboardCheck, FlaskConical, GitBranch, type LucideIcon, Users } from 'lucide-react'
import { Claude, Google, Grok, OpenAI } from '@lobehub/icons'
import { siGithub, siJira, siLinear } from 'simple-icons'
import type { ComponentType } from 'react'
import { Badge, Card, CardContent } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { EnergyFieldBg } from './EnergyFieldBg'
import { HeroFabric } from './hero-canvas/HeroFabric'
import { ScrollButton } from './ScrollButton'

// AI coding agents: @lobehub/icons full-color logos — colored AND dark-mode-safe, and the
// brand colors live inside that package (not our source), so the forbidden-colors gate stays
// happy. Google's mark stands in for Google Antigravity.
// Coloured where the brand actually has colour (Claude coral, Google multicolour). OpenAI
// and Grok are monochrome black marks — their `.Color` is black and vanishes on the dark
// card, so use the base (currentColor → foreground) to stay visible.
const LOBE_ICON: Record<string, ComponentType<{ size?: number }>> = {
  Codex: OpenAI,
  'Claude Code': Claude.Color,
  Grok,
  Antigravity: Google.Color
}

// Project tools: simple-icons, monochrome (currentColor) — theme-correct in light + dark.
const BRAND_PATH: Record<string, string> = {
  Jira: siJira.path,
  Linear: siLinear.path,
  'GitHub Issues': siGithub.path
}

// Methods aren't brands → themed lucide glyph.
const METHOD_ICON: Record<string, LucideIcon> = {
  TDD: FlaskConical,
  BDD: ClipboardCheck,
  'Trunk-based development': GitBranch,
  'Pair programming': Users
}

function ToolIcon({ tool }: { tool: string }) {
  const Lobe = LOBE_ICON[tool]
  if (Lobe) return <Lobe size={20} />
  const path = BRAND_PATH[tool]
  if (path) {
    return (
      <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' className='size-5 shrink-0'>
        <path d={path} />
      </svg>
    )
  }
  const Lucide = METHOD_ICON[tool]
  return Lucide ? <Lucide className='size-5 shrink-0' /> : null
}

// The compatibility chapter — agnosticism is the HERO here, not a footnote. Three equal
// cards make the "keep everything you use" promise the first thing the eye reads; the
// governed execution path sits below as the consequence. No canvas, no vendor logos/icons.
const CARDS = [
  { title: 'PROJECT-TOOL AGNOSTIC', tools: ['Jira', 'Linear', 'GitHub Issues'], fallback: 'or your own system' },
  {
    title: 'METHOD AGNOSTIC',
    tools: ['TDD', 'BDD', 'Trunk-based development', 'Pair programming'],
    fallback: "or your team's practice"
  },
  {
    title: 'AGENT-CLI AGNOSTIC',
    tools: ['Codex', 'Claude Code', 'Grok', 'Antigravity'],
    fallback: 'or another coding agent'
  }
]

export function WorkflowSection() {
  return (
    <section
      id='workflow'
      className='relative flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center px-6 py-6 text-center'
    >
      {/* Real fabric texture (same renderer as the hero) + the cursor-lighten dots layer. */}
      <HeroFabric />
      <EnergyFieldBg showGrid={false} />
      <div className='relative z-10 flex w-full flex-col items-center gap-6'>
        <div className='flex flex-col items-center gap-2'>
          <Text as='span' className='font-mono text-sm font-bold uppercase tracking-[0.2em] text-primary'>
            Agnostic by design
          </Text>
          <Heading
            level={2}
            className='max-w-[820px] text-balance font-sans text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl'
          >
            Keep your stack. <span className='rounded-lg bg-accent px-2'>Govern the work.</span>
          </Heading>
          <Text className='max-w-[620px] text-balance font-sans text-lg leading-relaxed text-muted-foreground'>
            Vinaya is agnostic to your project tool, development method, and coding agent.
          </Text>
        </div>

        {/* The three compatibility promises — the largest, most prominent objects here. */}
        <div className='grid w-full max-w-[960px] grid-cols-1 gap-5 sm:grid-cols-3'>
          {CARDS.map((card) => (
            <Card key={card.title} className='h-full w-full text-left'>
              <CardContent className='flex h-full flex-col gap-2.5'>
                <Text as='p' className='font-mono text-base font-bold uppercase tracking-wider text-foreground'>
                  {card.title}
                </Text>
                {/* Tools as brand-icon chips, one per row (no wrap). */}
                <div className='flex flex-col items-start gap-1.5'>
                  {card.tools.map((tool) => (
                    <Badge key={tool} variant='secondary' className='gap-2 px-3 py-1 font-mono text-sm text-foreground'>
                      <ToolIcon tool={tool} />
                      {tool}
                    </Badge>
                  ))}
                </div>
                <Text as='span' className='mt-auto pt-1 font-sans text-sm text-muted-foreground'>
                  {card.fallback}
                </Text>
              </CardContent>
            </Card>
          ))}
        </div>

        <ScrollButton targetId='protected'>
          Meet Vinaya
          <ArrowDown className='size-5' />
        </ScrollButton>
      </div>
    </section>
  )
}
