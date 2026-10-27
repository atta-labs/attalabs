'use client'

import { Card, CardContent, Heading, Text } from '@atta/ui/components'
import { ArrowUpRight } from 'lucide-react'
import { motion } from 'motion/react'
import { products } from '@/content/portfolio'
import { Reveal } from './Reveal'

export function ProductGrid() {
  return (
    <section id='products' className='mx-auto max-w-5xl scroll-mt-16 px-6 py-24 sm:py-32'>
      <Reveal className='mx-auto max-w-3xl'>
        <Text size='sm' className='mb-3 font-mono uppercase tracking-[0.3em] text-muted-foreground'>
          What I'm building
        </Text>
        <Heading level={2} size='3xl' className='font-serif'>
          Atta Labs — the lab, and everything shipping out of it.
        </Heading>
      </Reveal>

      <ul className='mt-14 grid gap-6 sm:grid-cols-2'>
        {products.map((product, index) => (
          <li key={product.href}>
            <Reveal delay={index * 0.1} className='h-full'>
              <motion.a
                href={product.href}
                target='_blank'
                rel='noreferrer'
                className='group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              >
                <Card className='h-full border-border transition-colors group-hover:border-primary'>
                  <CardContent className='flex h-full flex-col gap-3'>
                    <div className='flex items-start justify-between gap-4'>
                      <Heading level={3} size='xl' className='font-serif'>
                        {product.name}
                      </Heading>
                      <ArrowUpRight className='h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary' />
                    </div>
                    <Text className='text-muted-foreground'>{product.summary}</Text>
                    <Text as='span' size='xs' muted className='mt-auto pt-2 font-mono'>
                      {product.host}
                    </Text>
                  </CardContent>
                </Card>
              </motion.a>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
