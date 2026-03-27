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

export const ALL_TEST_PROFILES = [PERFECT_MATCH, PARTIAL_MATCH, WRONG_SPECIALTY, JUNIOR, FULL_STACK_PROFILE]
