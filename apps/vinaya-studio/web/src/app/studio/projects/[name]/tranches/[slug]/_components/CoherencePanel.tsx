'use client'

/**
 * CoherencePanel — calls /api/coherence and renders the oracle's report inline.
 *
 * Green when all checks pass; linked list of incoherences when any fail.
 * The Studio is a renderer — no check logic lives here.
 */

import { Button } from '@atta/ui/components'
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { CheckResult, CoherenceResponse } from '../../../../../../api/coherence/route'

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; data: CoherenceResponse }
  | { kind: 'error'; msg: string }

function githubIssueUrl(repo: CoherenceResponse['repo'], issue: number): string {
  if (!repo) return `#issue-${issue}`
  return `https://github.com/${repo.owner}/${repo.repo}/issues/${issue}`
}

export function CoherencePanel() {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function runCheck() {
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/coherence')
      const data = (await res.json()) as CoherenceResponse
      setState({ kind: 'done', data })
    } catch {
      setState({ kind: 'error', msg: 'Network error — could not reach /api/coherence.' })
    }
  }

  const isLoading = state.kind === 'loading'

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-3'>
        <Button variant='outline' size='sm' onClick={runCheck} disabled={isLoading} className='font-mono text-xs'>
          {isLoading ? (
            <RefreshCw className='mr-1.5 size-3.5 animate-spin' aria-hidden />
          ) : (
            <ShieldCheck className='mr-1.5 size-3.5' aria-hidden />
          )}
          {isLoading ? 'Checking…' : 'Check Coherence'}
        </Button>
        {state.kind === 'idle' && (
          <p className='font-sans text-xs text-muted-foreground'>
            Runs <span className='font-mono'>@attalabs/aeg-core</span>'s{' '}
            <span className='font-mono'>verify-coherence.ts</span> against the live forge.
          </p>
        )}
      </div>

      {state.kind === 'error' && (
        <div className='flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2'>
          <XCircle className='size-4 shrink-0 translate-y-0.5 text-destructive' aria-hidden />
          <p className='font-sans text-xs text-destructive'>{state.msg}</p>
        </div>
      )}

      {state.kind === 'done' && <CoherenceResult data={state.data} />}
    </div>
  )
}

function CoherenceResult({ data }: { data: CoherenceResponse }) {
  const { summary, checks, forgeUnavailable, oracleError, repo } = data

  if (oracleError) {
    return (
      <div className='flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2'>
        <XCircle className='size-4 shrink-0 translate-y-0.5 text-destructive' aria-hidden />
        <p className='font-sans text-xs text-destructive'>
          Oracle error: <span className='font-mono'>{oracleError}</span>
        </p>
      </div>
    )
  }

  const failed = checks.filter((r) => r.status === 'fail')
  const passed = checks.filter((r) => r.status === 'pass')

  return (
    <div className='space-y-3'>
      {forgeUnavailable && (
        <div className='flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2'>
          <AlertTriangle className='size-4 shrink-0 translate-y-0.5 text-warning' aria-hidden />
          <p className='font-sans text-xs text-warning'>
            Forge unavailable — forge-dependent checks skipped. Set <span className='font-mono'>GITHUB_TOKEN</span> or
            run <span className='font-mono'>gh auth login</span>.
          </p>
        </div>
      )}

      {failed.length === 0 ? (
        <div className='flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2'>
          <CheckCircle2 className='size-4 shrink-0 text-success' aria-hidden />
          <p className='font-sans text-xs text-success'>All checks pass — {passed.length} passed, 0 failed.</p>
        </div>
      ) : (
        <div className='space-y-2'>
          <p className='font-mono text-xs text-muted-foreground'>
            {summary.passed} passed · {summary.failed} failed · {summary.info} info
          </p>
          {failed.map((r) => (
            <FailedCheck key={r.check} result={r} repo={repo} />
          ))}
        </div>
      )}
    </div>
  )
}

function FailedCheck({ result, repo }: { result: CheckResult; repo: CoherenceResponse['repo'] }) {
  return (
    <div className='rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-2'>
      <div className='flex items-center gap-2'>
        <XCircle className='size-3.5 shrink-0 text-destructive' aria-hidden />
        <span className='font-mono text-xs font-semibold text-destructive'>{result.check}</span>
        {result.note && <span className='font-sans text-xs text-destructive/80'>{result.note}</span>}
      </div>
      {result.failures.length > 0 && (
        <ul className='space-y-1.5 pl-5'>
          {result.failures.map((f, i) => (
            <li key={i} className='font-sans text-xs text-destructive/90 leading-relaxed'>
              <span className='font-mono text-muted-foreground'>{f.tranche}</span>
              {f.task ? <span className='font-mono text-muted-foreground'> / {f.task}</span> : null}
              {f.issue != null ? (
                <>
                  {' '}
                  <a
                    href={githubIssueUrl(repo, f.issue)}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-mono text-destructive underline underline-offset-2 hover:text-destructive/70'
                  >
                    #{f.issue}
                  </a>
                </>
              ) : null}
              {' — '}
              {f.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
