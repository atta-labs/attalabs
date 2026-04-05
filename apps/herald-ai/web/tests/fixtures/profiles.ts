export interface TestProfile {
  id: string
  name: string
  title: string
  summary: string
  stack: string[]
  projects: Array<{ title: string; description: string }>
  experience: Array<{
    company: string
    role: string
    period: string
    highlights: string[]
  }>
  github_signal: { patterns: string[] }
}

export const PERFECT_MATCH: TestProfile = {
  id: 'perfect-match',
  name: 'Alex Chen',
  title: 'Senior Frontend Architect',
  summary:
    'Senior Frontend Architect with 12 years experience. Expert in React/Next.js at scale, Web3 wallet integration, and design system architecture. Built multi-tenant dApps serving 500k+ users across Ethereum and Polygon.',
  stack: [
    'React',
    'Next.js',
    'TypeScript',
    'Turborepo',
    'wagmi',
    'ethers.js',
    'viem',
    'TanStack Query',
    'Radix UI',
    'Tailwind CSS',
    'shadcn/ui',
    'Storybook',
    'Vitest',
    'Playwright',
    'GraphQL',
    'Zod'
  ],
  projects: [
    {
      title: 'DeFi Trading Dashboard',
      description:
        'Real-time trading interface for a DEX with 500k MAU. Turborepo monorepo, wagmi v2 wallet integration, WebSocket price feeds, sub-100ms render performance. Multi-chain support across Ethereum, Polygon, and Arbitrum.'
    },
    {
      title: 'Design System (Radix-based)',
      description:
        'Headless component system built on Radix UI primitives with Zod-validated component APIs. Storybook documentation, Chromatic visual regression, used across 4 product teams.'
    },
    {
      title: 'NFT Marketplace Frontend',
      description:
        'Next.js App Router marketplace with server-side blockchain data fetching, IPFS media resolution, and ERC-721/1155 transaction flows.'
    }
  ],
  experience: [
    {
      company: 'DeFi Protocol',
      role: 'Senior Frontend Architect',
      period: '2020 — 2024',
      highlights: [
        'Led frontend architecture across 3 product lines serving 500k+ users',
        'Migrated monolith to Turborepo monorepo reducing CI time by 60%',
        'Designed Zod-validated design token system adopted by 4 teams',
        'Integrated wagmi v2 across all products during Ethereum Merge'
      ]
    }
  ],
  github_signal: { patterns: ['turbo.json', 'zod', 'radix-ui', 'wagmi', 'active-commits-90-days', 'storybook'] }
}

export const PARTIAL_MATCH: TestProfile = {
  id: 'partial-match',
  name: 'Sarah Kim',
  title: 'Frontend Engineer',
  summary:
    'Frontend engineer with 5 years experience building React applications. Strong in component architecture and performance optimisation. No blockchain experience.',
  stack: [
    'React',
    'TypeScript',
    'Next.js',
    'Redux Toolkit',
    'Styled Components',
    'Jest',
    'React Testing Library',
    'Webpack',
    'REST APIs'
  ],
  projects: [
    {
      title: 'E-commerce Product Page',
      description:
        'React/Next.js product listing with server-side rendering, infinite scroll, and cart management. Optimised Core Web Vitals to 95+ Lighthouse score.'
    },
    {
      title: 'Internal Admin Dashboard',
      description:
        'React SPA for internal operations team. Complex data tables, role-based access control, REST API integration. Used daily by 200 staff.'
    }
  ],
  experience: [
    {
      company: 'SaaS Startup',
      role: 'Frontend Engineer',
      period: '2021 — 2024',
      highlights: [
        'Built and maintained React component library used across 2 products',
        'Reduced bundle size by 40% through code splitting and lazy loading',
        'Implemented accessibility improvements to meet WCAG 2.1 AA'
      ]
    }
  ],
  github_signal: { patterns: ['react', 'typescript', 'jest', 'active-commits-90-days'] }
}

export const WRONG_SPECIALTY: TestProfile = {
  id: 'wrong-specialty',
  name: 'Marco Silva',
  title: 'Senior Backend Engineer',
  summary:
    'Senior Backend Engineer with 10 years experience building high-availability Node.js microservices. Specialised in financial systems, distributed architecture, and database performance at scale. No frontend experience.',
  stack: [
    'Node.js',
    'TypeScript',
    'Express',
    'NestJS',
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'Kafka',
    'Docker',
    'Kubernetes',
    'gRPC',
    'REST',
    'Jest'
  ],
  projects: [
    {
      title: 'Payment Processing Service',
      description:
        'NestJS microservice handling 50k transactions/day. gRPC inter-service communication, idempotent API design, Kafka event sourcing. PCI-DSS compliant.'
    },
    {
      title: 'Real-time Analytics Pipeline',
      description:
        'Kafka-based event pipeline processing 1M events/hour. PostgreSQL time-series queries, Redis caching layer, 99.99% uptime SLA.'
    },
    {
      title: 'Multi-tenant SaaS API',
      description:
        'Multi-tenant REST API with row-level security in PostgreSQL, rate limiting via Redis, JWT auth, and automated compliance reporting.'
    }
  ],
  experience: [
    {
      company: 'Fintech Company',
      role: 'Senior Backend Engineer',
      period: '2019 — 2024',
      highlights: [
        'Designed microservices architecture handling $2M daily transaction volume',
        'Optimised PostgreSQL queries reducing p99 latency from 800ms to 40ms',
        'Led migration from monolith to 12-service architecture with zero downtime',
        'Implemented security hardening passing SOC2 Type II audit'
      ]
    }
  ],
  github_signal: { patterns: ['nodejs', 'nestjs', 'postgres', 'redis', 'docker', 'active-commits-90-days'] }
}

export const JUNIOR: TestProfile = {
  id: 'junior',
  name: 'Tom Walker',
  title: 'Frontend Developer',
  summary:
    'Frontend developer with 2 years experience. Comfortable with React and basic TypeScript. Still learning advanced patterns and system design. No Web3 or backend experience.',
  stack: ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Git', 'Figma'],
  projects: [
    { title: 'Personal Portfolio', description: 'Static React portfolio site with contact form. Deployed on Netlify.' },
    {
      title: 'Todo App',
      description: 'CRUD todo application with React hooks and localStorage persistence. First TypeScript project.'
    }
  ],
  experience: [
    {
      company: 'Small Web Agency',
      role: 'Junior Frontend Developer',
      period: '2022 — 2024',
      highlights: [
        'Built React components for 5 client websites',
        'Learned Git workflow and code review process',
        'Fixed CSS bugs and implemented designer mockups'
      ]
    }
  ],
  github_signal: { patterns: ['react', 'javascript'] }
}

export const FULL_STACK_PROFILE: TestProfile = {
  id: 'full-stack',
  name: 'Priya Nair',
  title: 'Senior Full Stack Engineer',
  summary:
    'Senior Full Stack Engineer with 8 years experience. Equal comfort on frontend (React/Next.js) and backend (Node.js/PostgreSQL). Some Web3 exposure via a DeFi side project.',
  stack: [
    'React',
    'Next.js',
    'TypeScript',
    'Node.js',
    'Express',
    'PostgreSQL',
    'Prisma',
    'Redis',
    'Docker',
    'AWS',
    'Tailwind CSS',
    'ethers.js',
    'GraphQL',
    'Zod'
  ],
  projects: [
    {
      title: 'SaaS Subscription Platform',
      description:
        'Full-stack Next.js SaaS with Stripe subscriptions, Postgres multi-tenant schema, Redis caching, and admin dashboard. 10k active users.'
    },
    {
      title: 'DeFi Yield Tracker (Side Project)',
      description:
        'Personal project tracking DeFi yield positions across protocols using ethers.js and The Graph. React frontend, Node.js cron jobs for on-chain data.'
    },
    {
      title: 'Internal DevOps Dashboard',
      description:
        'Next.js dashboard aggregating metrics from AWS CloudWatch, PagerDuty, and GitHub. WebSocket real-time updates, role-based access.'
    }
  ],
  experience: [
    {
      company: 'B2B SaaS Company',
      role: 'Senior Full Stack Engineer',
      period: '2020 — 2024',
      highlights: [
        'Owned full product stack from React frontend to PostgreSQL schema',
        'Reduced API response times by 65% through query optimisation and caching',
        'Mentored 3 junior engineers on full-stack architecture patterns',
        'Introduced Zod validation layer reducing production data errors by 80%'
      ]
    }
  ],
  github_signal: { patterns: ['zod', 'prisma', 'postgres', 'redis', 'docker', 'active-commits-90-days', 'ethers'] }
}

// ── PROFILE 6: Product Designer ───────────────────────────────────────────────
export const PRODUCT_DESIGNER: TestProfile = {
  id: 'product-designer',
  name: 'Mia Torres',
  title: 'Senior Product Designer',
  summary:
    'Senior Product Designer with 9 years experience. Expert in end-to-end product design, design systems, user research, and prototyping. Led design for B2B SaaS products serving 100k+ users.',
  stack: [
    'Figma',
    'Figma Dev Mode',
    'Design Tokens',
    'Storybook',
    'Framer',
    'Principle',
    'Maze (usability testing)',
    'Hotjar',
    'Miro',
    'Notion',
    'Linear',
    'Webflow',
    'Basic HTML/CSS'
  ],
  projects: [
    {
      title: 'Enterprise Design System',
      description:
        'Built a design system with 200+ components in Figma, design tokens synced to code via Tokens Studio, and Storybook documentation. Adopted across 5 product teams.'
    },
    {
      title: 'B2B Analytics Dashboard Redesign',
      description:
        'Led end-to-end redesign of analytics product. Conducted 30+ user interviews, built interactive prototypes in Figma, reduced task completion time by 40%.'
    },
    {
      title: 'Mobile Onboarding Flow',
      description:
        'Designed and tested a 4-step mobile onboarding flow. A/B tested 3 variants, increased activation rate from 32% to 58%.'
    }
  ],
  experience: [
    {
      company: 'B2B SaaS Platform',
      role: 'Senior Product Designer',
      period: '2020 — 2024',
      highlights: [
        'Owned design for core analytics product serving 100k+ users',
        'Built and maintained Figma design system with 200+ components',
        'Conducted 50+ user research sessions (interviews, usability tests, surveys)',
        'Collaborated with engineering on design token pipeline (Figma → code)',
        'Mentored 2 junior designers'
      ]
    }
  ],
  github_signal: { patterns: [] }
}

// ── PROFILE 7: Makeup Artist ──────────────────────────────────────────────────
export const MAKEUP_ARTIST: TestProfile = {
  id: 'makeup-artist',
  name: 'Luna Vasquez',
  title: 'Professional Makeup Artist',
  summary:
    "Professional makeup artist with 8 years experience in editorial, bridal, and film/TV makeup. Published in Vogue, Elle, and Harper's Bazaar. Certified in SFX and prosthetics.",
  stack: [
    'Editorial Makeup',
    'Bridal Makeup',
    'SFX / Prosthetics',
    'Airbrush Technique',
    'Color Theory',
    'Skin Prep & Skincare',
    'Photography Collaboration',
    'Client Consultation',
    'Product Knowledge (MAC, NARS, Pat McGrath)',
    'Social Media Content Creation'
  ],
  projects: [
    {
      title: 'Vogue Mexico Editorial',
      description:
        'Lead makeup artist for 12-page editorial spread. Collaborated with photographer and creative director on 6 distinct looks. Published December 2023 issue.'
    },
    {
      title: 'Independent Film — "Beneath the Surface"',
      description:
        'SFX and character makeup for 20-day shoot. Created aging prosthetics, wound effects, and continuity documentation for 8 principal cast members.'
    }
  ],
  experience: [
    {
      company: 'Freelance',
      role: 'Lead Makeup Artist',
      period: '2016 — 2024',
      highlights: [
        "Published editorial work in Vogue, Elle, and Harper's Bazaar",
        'Lead makeup artist for 15+ film/TV productions',
        'Built client base of 200+ bridal clients with 100% satisfaction rate',
        'Certified in SFX prosthetics (Gorton Studio, London)',
        'Created educational content reaching 50k followers on Instagram'
      ]
    }
  ],
  github_signal: { patterns: [] }
}

// ── PROFILE 8: Commercial Pilot ───────────────────────────────────────────────
export const PILOT: TestProfile = {
  id: 'pilot',
  name: 'James Okonkwo',
  title: 'Commercial Airline Pilot',
  summary:
    'Commercial airline pilot with 12 years experience and 8,000+ flight hours. Type-rated on Boeing 737 and Airbus A320. Instructor and check pilot qualified.',
  stack: [
    'Boeing 737 NG/MAX',
    'Airbus A320 Family',
    'ATPL (Airline Transport Pilot Licence)',
    'CRM (Crew Resource Management)',
    'LOFT (Line Oriented Flight Training)',
    'EFIS / Glass Cockpit',
    'IFR / VFR Operations',
    'ICAO English Level 6',
    'SMS (Safety Management Systems)',
    'Jeppesen FliteDeck Pro'
  ],
  projects: [
    {
      title: 'A320 Fleet Transition Programme',
      description:
        'Led training programme for airline transition from Boeing 737 to Airbus A320. Developed syllabus, trained 24 pilots over 6 months. Zero incidents during transition.'
    },
    {
      title: 'Safety Reporting System Overhaul',
      description:
        'Redesigned airline voluntary safety reporting process. Increased report submissions by 300% through simplified mobile reporting and non-punitive culture advocacy.'
    }
  ],
  experience: [
    {
      company: 'Major Airline',
      role: 'Senior First Officer / Check Pilot',
      period: '2015 — 2024',
      highlights: [
        '8,000+ total flight hours with zero incidents',
        'Type-rated on Boeing 737 NG/MAX and Airbus A320',
        'Qualified as Line Training Captain and Check Pilot',
        'Led fleet transition training programme for 24 pilots',
        'Voluntary Safety Report champion — 300% increase in submissions'
      ]
    }
  ],
  github_signal: { patterns: [] }
}

// ── PROFILE 9: Lawyer ─────────────────────────────────────────────────────────
export const LAWYER: TestProfile = {
  id: 'lawyer',
  name: 'Elena Petrova',
  title: 'Senior Corporate Lawyer',
  summary:
    'Senior corporate lawyer with 11 years experience specialising in M&A, venture capital financing, and technology licensing. Qualified in England & Wales and New York. Managed transactions totalling $2B+.',
  stack: [
    'M&A / Due Diligence',
    'Venture Capital / Series A-D',
    'Technology Licensing',
    'GDPR / Data Privacy',
    'Corporate Governance',
    'Contract Drafting & Negotiation',
    'Cross-border Transactions',
    'Legal Project Management',
    'Westlaw / LexisNexis',
    'DocuSign CLM'
  ],
  projects: [
    {
      title: '$500M SaaS Company Acquisition',
      description:
        'Led legal workstream for acquisition of enterprise SaaS platform. Managed due diligence across 12 jurisdictions, negotiated representations and warranties, and structured earn-out provisions.'
    },
    {
      title: 'Series C Financing ($80M)',
      description:
        'Represented fintech startup in Series C round. Drafted and negotiated term sheet, SHA, and SSA. Coordinated with 4 law firms across 3 jurisdictions.'
    }
  ],
  experience: [
    {
      company: 'International Law Firm',
      role: 'Senior Associate — Corporate / M&A',
      period: '2016 — 2024',
      highlights: [
        'Led 20+ M&A transactions totalling $2B+ in deal value',
        'Managed venture capital financings from seed to Series D',
        'Built technology licensing practice generating $3M annual revenue',
        'Dual-qualified: England & Wales (SRA) and New York (NYSBA)',
        'Trained and supervised 8 junior associates'
      ]
    }
  ],
  github_signal: { patterns: [] }
}

// ── PROFILE 10: Hospitality Manager ───────────────────────────────────────────
export const HOSPITALITY_MANAGER: TestProfile = {
  id: 'hospitality-manager',
  name: 'Sofia Andersson',
  title: 'Hotel Operations Manager',
  summary:
    'Hotel operations manager with 10 years experience in luxury hospitality. Managed properties with 200+ rooms, led teams of 80+, and achieved consistent 4.8+ guest satisfaction scores.',
  stack: [
    'Opera PMS',
    'Revenue Management (IDeaS)',
    'Guest Experience Design',
    'F&B Operations',
    'Team Leadership (80+ staff)',
    'P&L Management',
    'Quality Assurance / LQA Audits',
    'Sustainability Certifications (Green Key)',
    'Crisis Management',
    'Marriott / Hilton Brand Standards'
  ],
  projects: [
    {
      title: 'Boutique Hotel Opening',
      description:
        'Led pre-opening and launch of 120-room boutique hotel. Recruited and trained 65 staff, established SOPs, achieved 4.9 Google rating within first 6 months.'
    },
    {
      title: 'Sustainability Programme',
      description:
        'Designed and implemented hotel sustainability programme achieving Green Key certification. Reduced water consumption by 30%, food waste by 45%, and energy costs by 20%.'
    }
  ],
  experience: [
    {
      company: 'Luxury Hotel Group',
      role: 'Operations Manager',
      period: '2017 — 2024',
      highlights: [
        'Managed 220-room luxury property with annual revenue of $18M',
        'Led team of 85 across front office, housekeeping, F&B, and maintenance',
        'Achieved 4.8+ guest satisfaction score for 3 consecutive years',
        'Reduced staff turnover from 40% to 15% through culture and training initiatives',
        'Launched boutique hotel from pre-opening to operation in 4 months'
      ]
    }
  ],
  github_signal: { patterns: [] }
}

export const ALL_TEST_PROFILES = [
  PERFECT_MATCH,
  PARTIAL_MATCH,
  WRONG_SPECIALTY,
  JUNIOR,
  FULL_STACK_PROFILE,
  PRODUCT_DESIGNER,
  MAKEUP_ARTIST,
  PILOT,
  LAWYER,
  HOSPITALITY_MANAGER
]
