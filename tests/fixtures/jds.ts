export interface TestJD {
  id: string
  title: string
  content: string
}

export const SENIOR_FRONTEND_WEB3: TestJD = {
  id: 'senior-frontend-web3',
  title: 'Senior Frontend Engineer — Web3',
  content: `We are looking for a Senior Frontend Engineer to join our core product team.
You will own the frontend architecture of our flagship DeFi application, used by 200,000+ users across Ethereum, Polygon, and Arbitrum.

Requirements:
- 8+ years of frontend engineering experience
- Expert-level React and Next.js (App Router)
- TypeScript — strict mode, no any
- Web3 integration experience: wagmi, ethers.js, or viem
- Monorepo experience (Turborepo or Nx)
- Design system experience — building and maintaining component libraries
- Strong understanding of wallet UX patterns and transaction lifecycle

Nice to have:
- Smart contract interaction (read/write via ethers or wagmi)
- Experience with The Graph or on-chain data indexing
- Performance optimisation at scale (Core Web Vitals, bundle analysis)

Remote-first, async team. $150,000 — $200,000.`
}

export const SENIOR_FRONTEND_NO_WEB3: TestJD = {
  id: 'senior-frontend-no-web3',
  title: 'Senior Frontend Engineer',
  content: `We are hiring a Senior Frontend Engineer to lead our design system and component library initiatives.
You will work closely with design and product to establish frontend architecture standards across 3 product teams.

Requirements:
- 7+ years frontend experience
- React and Next.js at scale
- TypeScript with a focus on type safety and maintainability
- Experience building and maintaining a shared component library
- Monorepo tooling (Turborepo, Nx, or similar)
- Strong accessibility knowledge (WCAG 2.1 AA)
- Experience with headless CMS (Contentful, Sanity, or similar)

Nice to have:
- AI/LLM integration experience
- Experience with Storybook and visual regression testing
- Performance optimisation background

Remote-friendly. $130,000 — $170,000.`
}

export const SENIOR_BACKEND_NODE: TestJD = {
  id: 'senior-backend-node',
  title: 'Senior Backend Engineer — Node.js',
  content: `We are looking for a Senior Backend Engineer to join our core infrastructure team.
You will design and build the backend services that power our financial platform, processing millions of transactions daily.

Requirements:
- 7+ years of backend engineering experience
- Expert-level Node.js and TypeScript
- Microservices architecture — design, deployment, inter-service communication
- Database expertise: PostgreSQL (complex queries, indexing, partitioning) and Redis (caching strategies, pub/sub)
- Message queue experience (Kafka, RabbitMQ, or BullMQ)
- Security-first mindset: API security, data encryption, audit logging
- Experience with high-availability and fault-tolerant system design

Nice to have:
- Blockchain or Web3 integration experience
- Experience with compliance requirements (PCI-DSS, SOC2)
- gRPC or GraphQL API design

$140,000 — $180,000. Remote.`
}

export const FULL_STACK_JD: TestJD = {
  id: 'full-stack',
  title: 'Senior Full Stack Engineer',
  content: `We are an AI-first startup looking for a Senior Full Stack Engineer who can own features end to end — from database schema to polished UI.
You will build the core product: an AI-powered analytics platform for enterprise customers.

Requirements:
- 6+ years full stack experience
- React/Next.js on the frontend
- Node.js on the backend (API routes, background jobs)
- PostgreSQL — schema design, query optimisation
- AI/LLM integration experience (OpenAI, Anthropic, or similar APIs)
- Experience with streaming APIs and real-time data
- TypeScript throughout — strict, well-typed

Nice to have:
- Turborepo or monorepo experience
- Vercel AI SDK experience
- RAG architecture or vector database experience

Fully remote. $120,000 — $160,000.`
}

export const JUNIOR_FRONTEND: TestJD = {
  id: 'junior-frontend',
  title: 'Junior Frontend Developer',
  content: `We are a growing digital agency looking for a Junior Frontend Developer to join our delivery team.
You will work alongside senior developers building websites and web applications for our clients.

Requirements:
- 1-2 years of frontend experience
- Solid understanding of React fundamentals (hooks, state, props)
- Basic TypeScript knowledge
- Familiarity with CSS and responsive design
- Git workflow experience
- Willingness to learn and take feedback

Nice to have:
- Next.js experience
- Experience with a CSS framework (Tailwind, Bootstrap, or similar)

We provide mentorship and structured growth. $50,000 — $70,000.`
}

export const COMPLETELY_IRRELEVANT: TestJD = {
  id: 'completely-irrelevant',
  title: 'Senior Rust Systems Engineer',
  content: `We are building the next generation of low-level systems software and need a Senior Rust Engineer with deep expertise in systems programming.

Requirements:
- 8+ years of systems programming experience
- Expert-level Rust — memory management, lifetimes, unsafe code
- Linux kernel development experience
- Deep understanding of memory allocators, schedulers, and OS internals
- Experience writing device drivers or kernel modules
- Assembly language knowledge (x86_64 or ARM)
- Experience with embedded systems or real-time operating systems

This is NOT a web development role. No frontend, no JavaScript, no cloud.
Pure systems programming. $180,000 — $250,000.`
}

export const ALL_TEST_JDS = [
  SENIOR_FRONTEND_WEB3,
  SENIOR_FRONTEND_NO_WEB3,
  SENIOR_BACKEND_NODE,
  FULL_STACK_JD,
  JUNIOR_FRONTEND,
  COMPLETELY_IRRELEVANT
]
