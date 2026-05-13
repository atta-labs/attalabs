import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'

type ProductStatus = 'Live' | 'In build' | 'Conceptual' | 'Internal'

interface Product {
  name: string
  subtitle: string
  description: string
  status: ProductStatus
  url?: string
}

const PRODUCTS: Product[] = [
  {
    name: 'Vāda',
    subtitle: 'Deliberation engine',
    description:
      'Multi-agent adversarial deliberation. Available via web and MCP for Claude.ai, Cursor, and other AI assistants.',
    status: 'Live',
    url: 'https://vada.attalabs.dev'
  },
  {
    name: 'Atta',
    subtitle: 'Deep-thinking AI',
    description: 'Composed of Vāda + Vitakka + Sati. The product the lab is built around. Not yet deployed.',
    status: 'In build',
    url: undefined
  },
  {
    name: 'Vitakka',
    subtitle: 'Focused thinking',
    description:
      'A focus where your thinking compounds — artifacts, deliberation, accumulating conclusions. Standalone product and a layer inside Atta.',
    status: 'In build',
    url: undefined
  },
  {
    name: 'Sati',
    subtitle: 'Cross-AI memory',
    description: 'Your thinking, remembered across every model and session. The memory layer inside Atta.',
    status: 'Conceptual',
    url: undefined
  },
  {
    name: 'Herald',
    subtitle: 'Forensic CV-to-JD match',
    description:
      'Evidence-based hiring audits with GitHub signal detection. Sibling product in AttaLabs, not part of Atta.',
    status: 'In build',
    url: undefined
  },
  {
    name: 'Cetana',
    subtitle: 'Orchestration coordinator',
    description: 'Local Mac dispatch for AI agents working on the AttaLabs codebase. Internal dev tooling today.',
    status: 'Internal',
    url: undefined
  }
]

const badgeClass: Record<ProductStatus, string> = {
  Live: 'bg-primary text-primary-foreground',
  'In build': 'border-muted-foreground/40 text-muted-foreground/80',
  Conceptual: 'border-muted-foreground/20 text-muted-foreground/50',
  Internal: 'border-muted-foreground/30 text-muted-foreground/60'
}

export function EcosystemSection() {
  return (
    <section className='px-6 py-24'>
      <div className='mx-auto max-w-6xl'>
        <div className='mb-12 flex flex-col gap-4'>
          <Text as='p' className='font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
            01 / The Lab
          </Text>
          <Heading level={2} className='font-serif text-4xl leading-tight text-foreground md:text-5xl'>
            What we're building.
          </Heading>
          <Text as='p' className='max-w-2xl text-base leading-relaxed text-muted-foreground'>
            AttaLabs is a lab building AI products at the intersection of deliberation, focus, and memory. Some products
            are live. Some are in active build. Some are sequenced after revenue. Each product has its own surface; many
            compose with each other.
          </Text>
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {PRODUCTS.map((product) => {
            const hasUrl = !!product.url

            const card = (
              <Card
                className={`h-full border-border/40 bg-background/40 ${hasUrl ? 'transition-colors duration-300 group-hover:border-primary/40' : 'cursor-default opacity-60'}`}
              >
                <CardHeader className='pb-3'>
                  <CardTitle className='font-serif text-xl text-foreground'>{product.name}</CardTitle>
                  <Text as='p' className='text-xs text-muted-foreground'>
                    {product.subtitle}
                  </Text>
                </CardHeader>
                <CardContent className='flex flex-col justify-between gap-4 pt-0'>
                  <Text as='p' className='text-sm leading-relaxed text-muted-foreground'>
                    {product.description}
                  </Text>
                  <div className='flex items-center justify-between'>
                    <Badge
                      className={`text-xs ${badgeClass[product.status]}`}
                      variant={product.status === 'Live' ? 'default' : 'outline'}
                    >
                      {product.status}
                    </Badge>
                    {hasUrl && (
                      <span className='flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground'>
                        {product.url!.replace('https://', '')}
                        <ArrowRight className='h-3 w-3' />
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )

            return hasUrl ? (
              <a
                key={product.name}
                href={product.url}
                target='_blank'
                rel='noopener noreferrer'
                className='group block'
              >
                {card}
              </a>
            ) : (
              <div key={product.name}>{card}</div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
