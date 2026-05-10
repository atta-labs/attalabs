import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Octokit } from '@octokit/rest'
import { loadConfig } from './config.js'

const execFileAsync = promisify(execFile)

async function getOctokit(): Promise<{ octokit: Octokit; owner: string; repo: string }> {
  const config = loadConfig()
  const { owner, repo } = config.github

  let token = config.github.token
  if (!token) {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'])
    token = stdout.trim()
  }

  const octokit = new Octokit({ auth: token })
  return { octokit, owner, repo }
}

export async function getIssue(issueNumber: number): Promise<{
  title: string
  body: string
  labels: string[]
}> {
  const { octokit, owner, repo } = await getOctokit()
  const { data } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber })

  const labels = (data.labels ?? []).map((label) => {
    if (typeof label === 'string') return label
    return label.name ?? String(label)
  })

  return {
    title: data.title,
    body: data.body ?? '',
    labels
  }
}

export async function postIssueComment(issueNumber: number, body: string): Promise<void> {
  const { octokit, owner, repo } = await getOctokit()
  await octokit.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body })
}

export async function openPullRequest(args: {
  branch: string
  title: string
  body: string
  baseBranch?: string
}): Promise<{ url: string; number: number }> {
  const { octokit, owner, repo } = await getOctokit()
  const { data } = await octokit.rest.pulls.create({
    owner,
    repo,
    head: args.branch,
    base: args.baseBranch ?? 'main',
    title: args.title,
    body: args.body
  })
  return { url: data.html_url, number: data.number }
}
