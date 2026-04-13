'use client'

import { useState, useEffect } from 'react'
import {
  Heading,
  Text,
  Separator,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge
} from '@atta/ui'
import { AIACanvas, AIARing, AIASphere } from '@atta/ui/canvas'

// --- Miniature Ecosystem Nodes (Visual Engine) ---

function MiniVada({ active }: { active: boolean }) {
  return (
    <div className='relative flex h-24 w-24 items-center justify-center'>
      <div
        className={`absolute inset-0 rounded-full border transition-colors duration-1000 animate-[spin_15s_linear_infinite] ${active ? 'border-primary/40' : 'border-muted-foreground/20'}`}
      >
        <div className='absolute -top-2 left-1/2 -translate-x-1/2'>
          <AIASphere id='vada-sub-1' size={16} state={active ? 'speaking' : 'idle'} showMatrix={active} />
        </div>
        <div className='absolute -bottom-2 left-1/2 -translate-x-1/2'>
          <AIASphere id='vada-sub-2' size={16} state={active ? 'speaking' : 'idle'} showMatrix={active} />
        </div>
        <div className='absolute top-1/2 -left-2 -translate-y-1/2'>
          <AIASphere id='vada-sub-3' size={16} state={active ? 'speaking' : 'idle'} showMatrix={active} />
        </div>
        <div className='absolute top-1/2 -right-2 -translate-y-1/2'>
          <AIASphere id='vada-sub-4' size={16} state={active ? 'speaking' : 'idle'} showMatrix={active} />
        </div>
      </div>
    </div>
  )
}

function MiniVitakka({ active }: { active: boolean }) {
  return (
    <div className='relative flex h-24 w-24 items-center justify-center'>
      <div
        className={`absolute inset-0 rounded-full border-2 border-dashed transition-all duration-[1500ms] ${active ? 'scale-50 border-primary/40 opacity-0' : 'scale-100 border-muted-foreground/30 opacity-100'}`}
      />
      <AIASphere id='vitakka-center' size={36} state={active ? 'speaking' : 'idle'} showMatrix={active} />
    </div>
  )
}

function MiniMCP({ active }: { active: boolean }) {
  return (
    <div className='relative flex h-24 w-24 items-center justify-center'>
      <div
        className={`absolute inset-2 rotate-45 rounded-sm border transition-all duration-1000 ${active ? 'border-primary/40 scale-110' : 'border-muted-foreground/20 scale-100'}`}
      />
      <AIASphere id='mcp-center' size={28} state={active ? 'speaking' : 'idle'} showMatrix={active} />
    </div>
  )
}

// --- The Visual Background Engine ---

function EcosystemVisuals() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const sequence = async () => {
      await new Promise((r) => setTimeout(r, 500))
      setActiveStep(1) // Link Vitakka
      await new Promise((r) => setTimeout(r, 600))
      setActiveStep(2) // Link Vāda
      await new Promise((r) => setTimeout(r, 600))
      setActiveStep(3) // Link MCP
      await new Promise((r) => setTimeout(r, 1000))
      setActiveStep(4) // Integrate Memory Core
    }
    sequence()
  }, [])

  const isIntegrated = activeStep >= 4

  return (
    <div className='fixed inset-0 flex items-center justify-center pointer-events-none opacity-30 md:opacity-50 z-0'>
      <AIARing
        size={800}
        activeStep={activeStep}
        thinking={isIntegrated}
        sphereRadius={60}
        orbit={[
          <div key='vitakka' className='relative flex flex-col items-center opacity-40'>
            <MiniVitakka active={activeStep >= 1} />
          </div>,
          <div key='vada' className='relative flex flex-col items-center opacity-40'>
            <MiniVada active={activeStep >= 2} />
          </div>,
          <div key='mcp' className='relative flex flex-col items-center opacity-40'>
            <MiniMCP active={activeStep >= 3} />
          </div>
        ]}
      >
        <div className='relative flex flex-col items-center justify-center'>
          <div
            className={`absolute inset-[-40px] rounded-full border border-primary/10 transition-all duration-[3000ms] ${isIntegrated ? 'animate-[spin_40s_linear_infinite] opacity-100' : 'opacity-0'}`}
          />
          <div
            className={`absolute inset-[-60px] rounded-full border border-primary/5 border-dashed transition-all duration-[3000ms] ${isIntegrated ? 'animate-[spin_30s_linear_infinite_reverse] opacity-100' : 'opacity-0'}`}
          />

          <AIASphere id='atta-core' size={280} state={isIntegrated ? 'speaking' : 'idle'} showMatrix={isIntegrated} />
        </div>
      </AIARing>
    </div>
  )
}

// --- The Readable SaaS Portal ---

export default function AttaPortal({ isSignedIn }: { isSignedIn?: boolean }) {
  return (
    <AIACanvas particleCount={400} ambientRatio={0.2} className='fixed inset-0 w-full h-full bg-background z-0'>
      {/* 1. Mount the Animated Engine in the background */}
      <EcosystemVisuals />

      {/* 2. Scrollable Foreground Content */}
      <div className='relative z-10 w-full h-full overflow-y-auto'>
        {/* Navigation */}
        <nav className='sticky top-0 w-full border-b border-border/20 bg-background/60 backdrop-blur-md z-50'>
          <div className='container mx-auto px-6 h-16 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-3 h-3 rounded-full bg-primary animate-pulse' />
              <Text as='span' className='font-serif text-xl tracking-tight text-foreground'>
                attā
              </Text>
            </div>
            <div className='hidden md:flex items-center gap-8 text-sm uppercase tracking-widest text-muted-foreground'>
              <span className='hover:text-primary transition-colors cursor-pointer'>Ecosystem</span>
              <span className='hover:text-primary transition-colors cursor-pointer'>Vitakka</span>
              <span className='hover:text-primary transition-colors cursor-pointer'>Vāda</span>
            </div>
            <div>
              {!isSignedIn ? (
                <Button variant='outline' className='border-border/50 text-foreground'>
                  Enter System
                </Button>
              ) : (
                <Button>Workspace</Button>
              )}
            </div>
          </div>
        </nav>

        <main className='container mx-auto px-6 pt-32 pb-32'>
          {/* Hero Section */}
          <section className='flex flex-col items-center text-center max-w-4xl mx-auto mb-40 animate-in fade-in slide-in-from-bottom-4 duration-1000'>
            <Badge
              variant='outline'
              className='mb-8 tracking-[0.2em] uppercase text-xs border-primary/30 text-primary bg-primary/5 px-4 py-1'
            >
              The Cognitive Layer
            </Badge>
            <Heading
              level={1}
              className='text-6xl md:text-8xl font-serif tracking-tight mb-8 text-foreground leading-[1.1]'
            >
              Your intelligence, <br />
              <span className='italic text-primary/90'>unified.</span>
            </Heading>
            <Text as='p' className='text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl leading-relaxed'>
              The only AI ecosystem built to put every intelligence to work — together. Preserve your memory, connect
              your tools, and orchestrate your mind.
            </Text>
            <div className='flex flex-col sm:flex-row gap-6'>
              <Button size='lg' className='h-14 px-10 text-lg'>
                Open Workspace
              </Button>
            </div>
          </section>

          {/* The Ecosystem Grid */}
          <section className='mb-40 scroll-mt-24' id='ecosystem'>
            <div className='flex flex-col items-center mb-16 text-center'>
              <Heading level={2} className='text-4xl font-serif mb-4 text-foreground'>
                The Architecture
              </Heading>
              <Text as='p' className='text-muted-foreground max-w-xl text-lg'>
                Attā is the house. The products live inside it. Choose the exact mode of intelligence your problem
                requires.
              </Text>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {/* Vitakka Card */}
              <Card className='group border-border/40 bg-background/40 backdrop-blur-sm hover:bg-background/80 transition-all duration-500'>
                <CardHeader>
                  <div className='w-12 h-12 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                    <div className='w-4 h-4 rounded-full bg-primary/60' />
                  </div>
                  <Badge variant='secondary' className='w-fit mb-4'>
                    Standalone Focus
                  </Badge>
                  <CardTitle className='text-3xl font-serif text-foreground'>Vitakka</CardTitle>
                  <CardDescription className='text-base mt-2 text-muted-foreground'>
                    From Pāli: Directed Thought
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Text as='p' className='text-muted-foreground leading-relaxed mb-8'>
                    A personal AI thinking partner. Bring multiple AI minds together in one space to solve a specific
                    problem.
                  </Text>
                  <Button variant='link' className='px-0 text-primary'>
                    Explore the Chamber &rarr;
                  </Button>
                </CardContent>
              </Card>

              {/* Vāda Card */}
              <Card className='group border-border/40 bg-background/40 backdrop-blur-sm hover:bg-background/80 transition-all duration-500'>
                <CardHeader>
                  <div className='w-12 h-12 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                    <div className='w-4 h-4 rounded-full border-2 border-primary/60' />
                  </div>
                  <Badge variant='secondary' className='w-fit mb-4'>
                    Standalone Debate
                  </Badge>
                  <CardTitle className='text-3xl font-serif text-foreground'>Vāda</CardTitle>
                  <CardDescription className='text-base mt-2 text-muted-foreground'>
                    From Pāli: Deliberation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Text as='p' className='text-muted-foreground leading-relaxed mb-8'>
                    A multi-agent engine for adversarial synthesis. Watch the Strategist and Critic debate your problem
                    across three rounds.
                  </Text>
                  <Button variant='link' className='px-0 text-primary'>
                    Enter the Room &rarr;
                  </Button>
                </CardContent>
              </Card>

              {/* MCP Card */}
              <Card className='group border-border/40 bg-background/40 backdrop-blur-sm hover:bg-background/80 transition-all duration-500'>
                <CardHeader>
                  <div className='w-12 h-12 rounded-md border border-primary/20 bg-primary/5 rotate-45 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-90 transition-all duration-700'>
                    <div className='w-2 h-2 bg-primary/60' />
                  </div>
                  <Badge variant='secondary' className='w-fit mb-4 mt-2'>
                    Connected Sense Organs
                  </Badge>
                  <CardTitle className='text-3xl font-serif text-foreground'>MCP Tools</CardTitle>
                  <CardDescription className='text-base mt-2 text-muted-foreground'>
                    The Infrastructure Limbs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Text as='p' className='text-muted-foreground leading-relaxed mb-8'>
                    Connect specialized agents like Herald, GitHub, and Google Maps directly into your thinking
                    sessions. Live context, zero copy-pasting.
                  </Text>
                  <Button variant='link' className='px-0 text-primary'>
                    View the Toolkit &rarr;
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className='mb-32 bg-border/20' />

          {/* The Memory Core Section */}
          <section className='grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32 bg-background/60 backdrop-blur-md p-8 md:p-16 rounded-3xl border border-border/30'>
            <div>
              <Badge variant='outline' className='mb-6 border-primary/30 text-primary'>
                The Attā Core
              </Badge>
              <Heading level={2} className='text-4xl md:text-5xl font-serif mb-8 leading-tight text-foreground'>
                The conversation is scaffolding.
                <br />
                <span className='text-muted-foreground italic'>The conclusions are the building.</span>
              </Heading>
              <Text as='p' className='text-lg text-muted-foreground mb-10 leading-relaxed'>
                Every other AI remembers what you said inside its own isolated chats. Attā remembers what you concluded
                across all of them. By separating your facts from your behavioral patterns, the system grows with you
                instead of resetting every time you open a tab.
              </Text>

              <div className='flex flex-col gap-8'>
                <div className='flex gap-6'>
                  <div className='mt-1 w-2 h-2 rounded-full bg-primary shrink-0' />
                  <div>
                    <h4 className='text-xl font-medium mb-2 text-foreground'>Mem0 (The Facts)</h4>
                    <Text as='p' className='text-muted-foreground leading-relaxed'>
                      Your accepted conclusions are stored permanently in a semantic database. They surface
                      automatically when contextually relevant.
                    </Text>
                  </div>
                </div>
                <div className='flex gap-6'>
                  <div className='mt-1 w-2 h-2 rounded-full bg-primary shrink-0' />
                  <div>
                    <h4 className='text-xl font-medium mb-2 text-foreground'>LoRA (The Patterns)</h4>
                    <Text as='p' className='text-muted-foreground leading-relaxed'>
                      A fine-tuned engine that learns your orchestration style. It learns how you route to models,
                      drastically saving API overhead.
                    </Text>
                  </div>
                </div>
              </div>
            </div>

            {/* The "Buy" CTA Box */}
            <div className='flex items-center justify-center p-8'>
              <Card className='w-full border-primary/20 bg-primary/5'>
                <CardContent className='pt-8 flex flex-col items-center text-center'>
                  <Heading level={3} className='text-2xl font-serif mb-4 text-foreground'>
                    Upgrade to the Ecosystem
                  </Heading>
                  <Text as='p' className='text-muted-foreground mb-8'>
                    Stop copy-pasting your history. Get persistent memory, LoRA behavioral distillation, and full MCP
                    connectivity.
                  </Text>
                  <Button size='lg' className='w-full'>
                    Subscribe to Attā
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className='border-t border-border/20 bg-background/80 backdrop-blur-md py-12'>
          <div className='container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6'>
            <div className='flex items-center gap-3 text-muted-foreground'>
              <div className='w-3 h-3 rounded-full bg-primary' />
              <span className='font-serif text-xl tracking-tight'>attā</span>
            </div>
            <Text as='p' className='text-sm text-muted-foreground text-center md:text-left'>
              An Attā product · The only AI built to put every intelligence to work — together.
            </Text>
          </div>
        </footer>
      </div>
    </AIACanvas>
  )
}
