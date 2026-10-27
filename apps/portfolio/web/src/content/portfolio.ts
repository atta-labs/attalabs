/**
 * Every fact on the page, in one place. Sourced from Daniel's own published profile
 * (github.com/daniboomerang README) and CV — nothing here is invented copy, and
 * private CV details (phone, date of birth) are deliberately left out.
 */

export type ExternalLink = {
  label: string
  href: string
}

export type CareerEntry = {
  period: string
  role: string
  company: string
  place: string
  summary: string
}

export type Product = {
  name: string
  href: string
  host: string
  summary: string
}

export const profile = {
  name: 'Daniel Estevez',
  role: 'AI Systems Engineer',
  location: 'Thailand · Remote',
  thesis:
    "I build systems that scale, and I direct AI agents to build them — I never ship code I don't fully understand."
}

export const links: ExternalLink[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/estevezdani/' },
  { label: 'GitHub', href: 'https://github.com/daniboomerang' },
  { label: 'CV + Audit', href: 'https://herald.attalabs.dev/daniboomerang' }
]

export const story: string[] = [
  'It started in Madrid, with a Computer Science degree at the Polytechnic University, and then close to the hardware: home-automation products written in C at Zennio. From there, the booking engine at Amadeus — pure business logic, written from functional and technical specifications through integration, QA and production support.',
  'Then the web, and remote for good. Freelance full-stack, then a decade of frontends — conferences, board portals, Web3 games — each one owning architectural decisions end to end. At Game7 the work turned to AI: multi-agent content generation with intelligent model routing, a custom evaluation framework for non-deterministic outputs, and the team’s AI-augmented development workflow.',
  'Since 2026 I am independent. I design systems where agents and humans build side by side: structured specs as implementation briefs, mandatory non-author review of agent-written code, strict tech-debt and context discipline. Fifteen years of engineering judgment is what makes the AI part work — I direct agents rather than defer to them.'
]

export const stats: { value: number; suffix: string; label: string }[] = [
  { value: 15, suffix: '+', label: 'years shipping production software' },
  { value: 4, suffix: '+', label: 'years building with AI agents, every day' },
  { value: 4, suffix: '', label: 'products live in Atta Labs' }
]

export const career: CareerEntry[] = [
  {
    period: '2026 — now',
    role: 'Independent · Founder',
    company: 'Atta Labs',
    place: 'Thailand · Remote',
    summary:
      'Directing agent teams full-time. Agent teams written as specifications and compiled into executable flows, a multi-LLM engine routing across Claude, Gemini, GPT and Grok, and an MCP server with bearer auth and envelope-encrypted keys.'
  },
  {
    period: '2023 — 2026',
    role: 'Senior Frontend Contributor',
    company: 'Game7',
    place: 'United States · Remote',
    summary:
      'Designed multi-agent AI content generation with intelligent model routing, built an evaluation framework for non-deterministic outputs, and established the team’s AI-augmented development workflow.'
  },
  {
    period: '2021 — 2023',
    role: 'Frontend Lead',
    company: 'Elixir Games',
    place: 'San Francisco Bay Area · Remote',
    summary: 'Led the frontend for a Web3 games platform — architecture, team and delivery.'
  },
  {
    period: '2020 — 2021',
    role: 'Frontend Engineer',
    company: 'Sherpany',
    place: 'Zurich · Remote',
    summary: 'Frontend engineering on the Sherpany web platform.'
  },
  {
    period: '2016 — 2020',
    role: 'Frontend Developer',
    company: 'Conferize',
    place: 'Worldwide · Remote',
    summary: 'Built and maintained the Conferize web application with React, ES6 and Apollo GraphQL.'
  },
  {
    period: '2013 — 2016',
    role: 'Full Stack Web Developer',
    company: 'Freelance',
    place: 'Remote',
    summary:
      'End-to-end sites on the MEAN stack — design and UX, REST APIs, the database, and full unit + E2E test suites.'
  },
  {
    period: '2010 — 2013',
    role: 'Software Engineer',
    company: 'Amadeus IT Group',
    place: 'Sophia Antipolis, France',
    summary:
      'R&D, business-logic team of the Amadeus booking engine — functional and technical specs, development, integration, QA and production maintenance.'
  },
  {
    period: '2008 — 2010',
    role: 'Software Engineer',
    company: 'Zennio',
    place: 'Toledo, Spain',
    summary: 'Designed and built home-automation products to the KNX standard, in C, J2EE and LabVIEW.'
  }
]

export const products: Product[] = [
  {
    name: 'Vāda',
    href: 'https://vada.attalabs.dev',
    host: 'vada.attalabs.dev',
    summary: 'Deep-thinking AI — deliberation layers (Vāda + Vitakka + Sati) for structured reasoning.'
  },
  {
    name: 'Herald',
    href: 'https://herald.attalabs.dev',
    host: 'herald.attalabs.dev',
    summary: 'Forensic hiring audits — matches a candidate against a job description with evidence, not vibes.'
  },
  {
    name: 'Vinaya',
    href: 'https://vinaya.attalabs.dev',
    host: 'vinaya.attalabs.dev',
    summary:
      'The harness that keeps a codebase honest while agents write most of it — deterministic checks, one path for every change.'
  },
  {
    name: 'Atta Labs',
    href: 'https://github.com/daniboomerang/attalabs',
    host: 'github.com/daniboomerang/attalabs',
    summary:
      'The monorepo where all of it runs, Vinaya-governed end to end. It is all open — read the code and the issues.'
  }
]
