import { listPublicSpecs } from '@atta/engine'
import { Heading } from '@atta/ui/shared'
import { TeamCard } from './components/TeamCard'

// Simplest first: plain reviewers, then the same with synthesis, then the deeper audited panel.
// Any public spec not named here follows, in catalog order.
const TEAM_ORDER = [
  'vada-reviewers',
  'vada-reviewers-synthesis',
  'vada-council',
  'vada-council-synthesis',
  'vada-fusion-native'
]
const rank = (id: string) => {
  const i = TEAM_ORDER.indexOf(id)
  return i === -1 ? TEAM_ORDER.length : i
}

export default function TeamsPage() {
  const specs = [...listPublicSpecs()].sort((a, b) => rank(a.id) - rank(b.id))

  // Server-side search availability: reflects whether Vāda's search infrastructure
  // is configured, not per-user BYOK keys. Safe to pass as a boolean to the client.
  const searchAvailable =
    !!process.env.TAVILY_API_KEY || (!!process.env.GOOGLE_SEARCH_API_KEY && !!process.env.GOOGLE_SEARCH_CX)

  return (
    <div className='mx-auto max-w-5xl space-y-8 px-4 py-12'>
      <div className='space-y-1'>
        <Heading level={1} size='xl' className='font-serif text-foreground'>
          Teams
        </Heading>
        <p className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>
          {specs.length} published · agent configurations
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {specs.map((spec) => (
          <TeamCard key={spec.id} spec={spec} searchAvailable={searchAvailable} />
        ))}
      </div>
    </div>
  )
}
