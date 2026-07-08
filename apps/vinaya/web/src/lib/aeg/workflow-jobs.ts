import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { findRepoRoot, githubBlobUrl } from './repo'

export type WorkflowStep = {
  name: string
  line: number
}

export type WorkflowJob = {
  id: string
  name: string
  line: number
  steps: WorkflowStep[]
}

export type ParsedWorkflow = {
  relPath: string
  jobs: WorkflowJob[]
}

const JOB_ID_PATTERN = /^ {2}([a-zA-Z0-9_-]+):$/
const JOB_NAME_PATTERN = /^ {4}name:\s*(.+)$/
const STEP_NAME_PATTERN = /^\s{6}- name:\s*(.+)$/

function unquote(raw: string): string {
  const trimmed = raw.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/**
 * Regex-based GitHub Actions job/step extractor — no YAML parser dependency.
 * Relies on this repo's consistent 2/4/6-space indentation for `jobs:` →
 * job id → `name:` → steps, verified against every workflow file this page
 * links into. If a workflow's indentation ever changes, jobs/steps here fall
 * to zero rather than silently drifting — see `RING_LINKS`'s zero-match path.
 */
export async function parseWorkflowJobs(relPath: string): Promise<ParsedWorkflow> {
  const repoRoot = findRepoRoot()
  const raw = await fs.readFile(path.join(repoRoot, relPath), 'utf8')
  const lines = raw.split('\n')

  const jobs: WorkflowJob[] = []
  let currentJob: WorkflowJob | null = null
  let inJobsBlock = false

  lines.forEach((line, idx) => {
    if (/^jobs:$/.test(line)) {
      inJobsBlock = true
      return
    }
    if (!inJobsBlock) return

    const jobMatch = line.match(JOB_ID_PATTERN)
    if (jobMatch?.[1]) {
      currentJob = { id: jobMatch[1], name: jobMatch[1], line: idx + 1, steps: [] }
      jobs.push(currentJob)
      return
    }

    if (currentJob) {
      const nameMatch = line.match(JOB_NAME_PATTERN)
      if (nameMatch?.[1]) {
        currentJob.name = unquote(nameMatch[1])
        return
      }
      const stepMatch = line.match(STEP_NAME_PATTERN)
      if (stepMatch?.[1]) {
        currentJob.steps.push({ name: unquote(stepMatch[1]), line: idx + 1 })
      }
    }
  })

  return { relPath, jobs }
}

export type WorkflowMatch = {
  workflowRelPath: string
  jobId: string
  jobName: string
  stepName?: string
  href: string
}

/**
 * Finds every job/step across `workflows` whose name contains `keyword`
 * (case-insensitive substring). Job-level matches link to the job's own
 * `name:` line; step-level matches link to the step's `- name:` line.
 */
export function findMatches(workflows: ParsedWorkflow[], keyword: string): WorkflowMatch[] {
  const needle = keyword.toLowerCase()
  const matches: WorkflowMatch[] = []

  for (const workflow of workflows) {
    for (const job of workflow.jobs) {
      if (job.name.toLowerCase().includes(needle)) {
        matches.push({
          workflowRelPath: workflow.relPath,
          jobId: job.id,
          jobName: job.name,
          href: githubBlobUrl(workflow.relPath, job.line)
        })
      }
      for (const step of job.steps) {
        if (step.name.toLowerCase().includes(needle)) {
          matches.push({
            workflowRelPath: workflow.relPath,
            jobId: job.id,
            jobName: job.name,
            stepName: step.name,
            href: githubBlobUrl(workflow.relPath, step.line)
          })
        }
      }
    }
  }

  return matches
}
