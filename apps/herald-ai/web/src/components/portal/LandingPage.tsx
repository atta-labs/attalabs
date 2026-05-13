import { Button } from '@atta/ui/components/button'
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
          Paste a job description against a candidate&apos;s Herald link. Get an evidence-based match audit — claims
          verified, gaps named, GitHub signal cross-checked, interview hooks pre-extracted. Not a score. An audit.
        </Text>
        <div className='mt-8 flex flex-wrap items-center justify-center gap-4'>
          <NextLink variant='button' href='/sign-in'>
            Sign in to audit a candidate
          </NextLink>
          <Button asChild variant='ghost'>
            <a href='#how-it-works'>How it works ↓</a>
          </Button>
        </div>
      </header>

      {/* Section 1 — For Recruiters */}
      <section className='border-t border-border py-16'>
        <Text as='p' className='mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
          01 / FOR RECRUITERS
        </Text>
        <Heading level={2} className='mb-8 max-w-2xl font-serif text-4xl leading-tight text-foreground'>
          Stop reading CVs. Start reading audits.
        </Heading>
        <Text as='p' className='mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Most CV-screening tools score candidates on keyword overlap and call it a match. Herald reads the
          candidate&apos;s full profile — work history, claimed skills, public GitHub activity — and writes you a
          forensic audit against the specific job you&apos;re hiring for. Where the candidate is strong. Where the CV
          softens reality. Which claims survive cross-checking against real code shipped. Where the gap is too big to
          bridge in an interview.
        </Text>
        <Text as='p' className='mb-12 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          The output is a graded report you can forward to a hiring manager without rewriting. Every claim is traced to
          its source — the CV line, the GitHub repo, the date. You&apos;re not trusting Herald. You&apos;re auditing
          what Herald audited.
        </Text>
        <div className='space-y-6'>
          <div className='flex items-start gap-4'>
            <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
              01
            </Text>
            <div>
              <Text as='p' className='font-mono text-xs uppercase tracking-widest text-foreground'>
                GRADED MATCH AUDIT
              </Text>
              <Text as='p' className='mt-1 text-sm leading-relaxed text-muted-foreground'>
                A/B/C/D rating against the JD, with the evidence chain behind it.
              </Text>
            </div>
          </div>
          <div className='flex items-start gap-4'>
            <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
              02
            </Text>
            <div>
              <Text as='p' className='font-mono text-xs uppercase tracking-widest text-foreground'>
                CROSS-CHECKED CLAIMS
              </Text>
              <Text as='p' className='mt-1 text-sm leading-relaxed text-muted-foreground'>
                Skills declared in the CV verified against public GitHub activity — what they&apos;ve actually shipped,
                in which languages, how recently.
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
                Hyper-specific questions extracted from the candidate&apos;s real work. No generic &quot;tell me about a
                time&quot; prompts.
              </Text>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — The GitHub Signal */}
      <section className='border-t border-border py-16'>
        <Text as='p' className='mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
          02 / THE GITHUB SIGNAL
        </Text>
        <Heading level={2} className='mb-8 font-serif text-4xl leading-tight text-foreground'>
          CVs lie. Code doesn&apos;t.
        </Heading>
        <Text as='p' className='mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          A candidate claims five years of Rust. Herald checks their GitHub. Most recent Rust commit was two years ago,
          on a forked tutorial repo. One claims &quot;led a team of 12&quot; — their public commit graph shows solo work
          on small repos. One claims junior-level — turns out they&apos;ve maintained a library with 4k stars for three
          years.
        </Text>
        <Text as='p' className='mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Herald reads public GitHub activity as part of every audit: language distribution, commit frequency, repo
          ownership, contribution patterns, recent vs. lifetime work. The signal goes into the audit explicitly: where
          it confirms the CV, where it contradicts it, where the candidate is quietly stronger than they&apos;re
          advertising.
        </Text>
        <Text as='p' className='mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          No GitHub doesn&apos;t mean an automatic downgrade. Herald notes the absence and weights the rest of the audit
          accordingly. Senior engineers who&apos;ve worked behind closed corporate walls for a decade aren&apos;t
          penalized; they&apos;re audited on the evidence available.
        </Text>
        <Text as='p' className='max-w-2xl text-sm italic text-muted-foreground/60'>
          The strongest candidates are usually the ones whose code says more than their CV does.
        </Text>
      </section>

      {/* Section 3 — How it works */}
      <section id='how-it-works' className='border-t border-border py-16'>
        <Text as='p' className='mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
          03 / HOW IT WORKS
        </Text>
        <Heading level={2} className='mb-4 font-serif text-4xl leading-tight text-foreground'>
          For recruiters and candidates both.
        </Heading>
        <Text as='p' className='mb-12 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Herald is a two-sided audit tool. Candidates publish a permanent forensic profile at their Herald URL.
          Recruiters audit candidates against specific JDs. Both flows work without the other side present.
        </Text>
        <div className='grid gap-12 md:grid-cols-2'>
          <div>
            <Text as='p' className='mb-6 font-mono text-xs uppercase tracking-widest text-foreground'>
              For recruiters
            </Text>
            <div className='space-y-3'>
              <div className='flex items-baseline gap-4 text-sm'>
                <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
                  01
                </Text>
                <Text as='span' className='text-muted-foreground'>
                  Open a candidate&apos;s Herald link
                </Text>
              </div>
              <div className='flex items-baseline gap-4 text-sm'>
                <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
                  02
                </Text>
                <Text as='span' className='text-muted-foreground'>
                  Paste the job description
                </Text>
              </div>
              <div className='flex items-baseline gap-4 text-sm'>
                <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
                  03
                </Text>
                <Text as='span' className='text-muted-foreground'>
                  Get a graded forensic audit in seconds
                </Text>
              </div>
              <div className='flex items-baseline gap-4 text-sm'>
                <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
                  04
                </Text>
                <Text as='span' className='text-muted-foreground'>
                  Forward the report to your hiring manager
                </Text>
              </div>
            </div>
          </div>
          <div>
            <Text as='p' className='mb-6 font-mono text-xs uppercase tracking-widest text-foreground'>
              For candidates
            </Text>
            <div className='space-y-3'>
              <div className='flex items-baseline gap-4 text-sm'>
                <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
                  01
                </Text>
                <Text as='span' className='text-muted-foreground'>
                  Sign up and claim your username
                </Text>
              </div>
              <div className='flex items-baseline gap-4 text-sm'>
                <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
                  02
                </Text>
                <Text as='span' className='text-muted-foreground'>
                  Upload your CV — Herald extracts everything automatically
                </Text>
              </div>
              <div className='flex items-baseline gap-4 text-sm'>
                <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
                  03
                </Text>
                <Text as='span' className='text-muted-foreground'>
                  Connect your GitHub (optional, but strengthens the signal)
                </Text>
              </div>
              <div className='flex items-baseline gap-4 text-sm'>
                <Text as='span' className='shrink-0 font-mono text-xs text-muted-foreground'>
                  04
                </Text>
                <Text as='span' className='text-muted-foreground'>
                  Share your Herald URL with recruiters
                </Text>
              </div>
            </div>
          </div>
        </div>
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
          Herald doesn&apos;t decide who to hire. It does the forensic preparation so recruiters and hiring managers can
          decide faster, with the receipts on the table.
        </Text>
        <Text as='p' className='mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Herald doesn&apos;t rank candidates against each other. Every audit is one candidate, one JD, on its own
          merits. No leaderboards.
        </Text>
        <Text as='p' className='max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Herald doesn&apos;t replace interviews. It writes them. The strongest output of every audit is the set of
          interview hooks extracted from the candidate&apos;s actual work — questions a recruiter could not have
          generated without reading the same evidence Herald just read.
        </Text>
      </section>

      {/* Footer */}
      <footer className='mt-12 border-t border-border pt-6 text-center'>
        <Text as='p' className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>
          Herald · Forensic hiring audits · heyherald.com
        </Text>
        <Text as='p' className='mt-2 font-mono text-xs text-muted-foreground/60'>
          An AttaLabs product
        </Text>
      </footer>
    </div>
  )
}
