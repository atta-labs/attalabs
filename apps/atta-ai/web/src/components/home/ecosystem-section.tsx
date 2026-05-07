import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'

type ProductStatus = 'Live' | 'Paused' | 'Conceptual' | 'Future'

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
    subtitle: 'From Pāli: Deliberation',
    description: 'Multi-agent deliberation engine. The first product.',
    status: 'Live',
    url: 'https://vada.attalabs.dev',
  },
  {
    name: 'Herald',
    subtitle: 'Pluggable MCP tool',
    description: 'Forensic CV-to-job-description match tool. English name — plugs in to Atta.',
    status: 'Live',
  },
  {
    name: 'Vitakka',
    subtitle: 'From Pāli: Directed thought',
    description: 'Personal AI thinking partner. Resumes after Vāda revenue milestone.',
    status: 'Paused',
  },
  {
    name: 'Sati',
    subtitle: 'From Pāli: Mindfulness',
    description: 'Cross-provider memory layer. Builds downstream of Vitakka.',
    status: 'Conceptual',
  },
  {
    name: 'Cetana',
    subtitle: 'From Pāli: Intention',
    description: 'Deliberation-guided execution. Long-horizon.',
    status: 'Future',
  },
]

const badgeClass: Record<ProductStatus, string> = {
  Live: 'bg-primary text-primary-foreground',
  Paused: 'border-muted-foreground/30 text-muted-foreground/70',
  Conceptual: 'border-muted-foreground/20 text-muted-foreground/50',
  Future: 'border-muted-foreground/10 text-muted-foreground/40',
}

export function EcosystemSection() {
  return (
    <section className='px-6 py-24'>
      <div className='mx-auto max-w-6xl'>
        <div className='mb-12 flex flex-col gap-4'>
          <Text as='p' className='font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
            03 / Ecosystem
          </Text>
          <Heading level={2} className='font-serif text-4xl leading-tight text-foreground md:text-5xl'>
            The Atta Ecosystem
          </Heading>
          <Text as='p' className='max-w-2xl text-base leading-relaxed text-muted-foreground'>
            Atta is an ecosystem of AI products. Each product has a Pāli name; tools that plug in have English names.
            Vāda is the first; others are sequenced after it.
          </Text>
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {PRODUCTS.map((product) => {
            const isLive = product.status === 'Live'

            const card = (
              <Card
                className={`h-full border-border/40 bg-background/40 ${
                  isLive
                    ? 'transition-colors duration-300 group-hover:border-primary/40'
                    : 'cursor-default opacity-60'
                }`}
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
                      variant={isLive ? 'default' : 'outline'}
                    >
                      {product.status}
                    </Badge>
                    {product.url && (
                      <span className='flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground'>
                        {product.url.replace('https://', '')}
                        <ArrowRight className='h-3 w-3' />
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )

            return isLive && product.url ? (
              <a key={product.name} href={product.url} target='_blank' rel='noopener noreferrer' className='group block'>
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
