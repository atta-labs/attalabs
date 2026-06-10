import { Button } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'

export function LandingPage() {
  return (
    <div className='mx-auto max-w-4xl px-6 py-20'>
      {/* Hero */}
      <header className='mb-20 text-center'>
        <Text as='p' className='mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
          HERALD · FORENSIC HIRING AUDIT
        </Text>
        <Heading level={1} className='text-balance font-serif text-5xl leading-tight text-foreground'>
          Forensic clarity on who actually fits the job.
        </Heading>
        <Text as='p' className='mx-auto mt-6 max-w-2xl text-balance text-xl text-muted-foreground'>
          Run a Bulk Audit across CVs and job descriptions. Every CV × JD pair gets its own evidence-based match report
          — claims verified, GitHub activity cross-checked, interview hooks pre-extracted. Not a score. An audit.
        </Text>
        <div className='mt-8 flex flex-wrap items-center justify-center gap-4'>
          <Button asChild>
            <NextLink variant='unstyled' href='/sign-in'>
              Sign in to run an audit
            </NextLink>
          </Button>
          <Button asChild variant='outline'>
            <a href='#how-it-works'>How it works ↓</a>
          </Button>
        </div>
      </header>

      {/* Section 1 — Bulk Audit */}
      <section className='border-t border-border py-16'>
        <Text as='p' className='mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
          01 / BULK AUDIT
        </Text>
        <Heading level={2} className='mb-8 max-w-2xl font-serif text-4xl leading-tight text-foreground'>
          One tool. Any number of CVs. Any number of roles.
        </Heading>
        <Text as='p' className='mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Bulk Audit takes the CVs you want to evaluate and the job descriptions you want to evaluate them against.
          Every CV × JD pair gets its own forensic report. A recruiter runs many candidates against one role. A
          candidate runs their own CV against many roles. Same tool — you choose the inputs.
        </Text>
        <Text as='p' className='mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Inputs are flexible: paste the text, upload a file, or point at a candidate&apos;s published Herald profile.
          Outputs are independent — each report stands on its own evidence, with the grade, the gaps, and the interview
          hooks for that specific pair.
        </Text>
      </section>

      {/* Section 2 — How the audit works */}
      <section id='how-it-works' className='border-t border-border py-16'>
        <Text as='p' className='mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
          02 / HOW THE AUDIT WORKS
        </Text>
        <Heading level={2} className='mb-8 max-w-2xl font-serif text-4xl leading-tight text-foreground'>
          CVs lie. Code doesn&apos;t.
        </Heading>
        <Text as='p' className='mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Herald reads the CV and the JD, then cross-checks claimed skills against real shipped code. An agent inspects
          the candidate&apos;s public GitHub activity — which languages, which repos, how recently — and weighs the
          claim against the evidence.
        </Text>
        <Text as='p' className='mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          No GitHub isn&apos;t a penalty. Herald notes the absence and weights the rest of the audit accordingly. Senior
          engineers who&apos;ve worked behind closed corporate walls aren&apos;t downgraded — they&apos;re audited on
          the evidence that is available.
        </Text>
        <div className='space-y-6'>
          <div className='flex items-start gap-4'>
            <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
              01
            </Text>
            <div>
              <Text as='p' className='font-mono text-xs uppercase tracking-widest text-foreground'>
                GRADED MATCH
              </Text>
              <Text as='p' className='mt-1 text-sm leading-relaxed text-muted-foreground'>
                A/A-/B+/B against the JD, with the evidence chain behind the grade.
              </Text>
            </div>
          </div>
          <div className='flex items-start gap-4'>
            <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
              02
            </Text>
            <div>
              <Text as='p' className='font-mono text-xs uppercase tracking-widest text-foreground'>
                GITHUB-VERIFIED CLAIMS
              </Text>
              <Text as='p' className='mt-1 text-sm leading-relaxed text-muted-foreground'>
                Skills declared in the CV checked against public GitHub activity — what was shipped, in which languages,
                how recently.
              </Text>
            </div>
          </div>
          <div className='flex items-start gap-4'>
            <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
              03
            </Text>
            <div>
              <Text as='p' className='font-mono text-xs uppercase tracking-widest text-foreground'>
                INTERVIEW HOOKS
              </Text>
              <Text as='p' className='mt-1 text-sm leading-relaxed text-muted-foreground'>
                Hyper-specific questions extracted from the candidate&apos;s actual work. No generic prompts.
              </Text>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — The Herald profile */}
      <section className='border-t border-border py-16'>
        <Text as='p' className='mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
          03 / THE HERALD PROFILE
        </Text>
        <Heading level={2} className='mb-8 max-w-2xl font-serif text-4xl leading-tight text-foreground'>
          A permanent forensic profile at your Herald URL.
        </Heading>
        <Text as='p' className='mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Anyone can publish a Herald profile — a single shareable page with CV, experience, stack, and GitHub handle.
          Once it&apos;s live at <span className='font-mono text-foreground'>/username</span>, recruiters can audit it
          against any JD, and the candidate can re-use it against any role they care about.
        </Text>
        <Text as='p' className='max-w-2xl text-base leading-relaxed text-muted-foreground'>
          The profile is the public artifact. The audit is what happens when you point it at a job.
        </Text>
      </section>

      {/* Section 4 — What Herald isn't */}
      <section className='border-t border-border py-16'>
        <Text as='p' className='mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
          04 / WHAT HERALD ISN&apos;T
        </Text>
        <Heading level={2} className='mb-8 max-w-2xl font-serif text-4xl leading-tight text-foreground'>
          Not a recruiter replacement. Not a scoring algorithm.
        </Heading>
        <Text as='p' className='mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Herald doesn&apos;t decide who to hire. It does the forensic preparation so recruiters and candidates can move
          faster, with the receipts on the table.
        </Text>
        <Text as='p' className='mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Herald doesn&apos;t rank candidates against each other. Every audit is one CV, one JD, on its own merits. No
          leaderboards.
        </Text>
        <Text as='p' className='max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Herald doesn&apos;t replace interviews. It writes them. The strongest output of every audit is the set of
          interview hooks extracted from the candidate&apos;s actual work — questions a recruiter could not have
          generated without reading the same evidence Herald just read.
        </Text>
      </section>
    </div>
  )
}
