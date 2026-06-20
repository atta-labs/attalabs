import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { run } from '@atta/forensic-hiring-auditor'

export interface HeraldMcpCredentials {
  vendor: string
  modelId: string
  apiKey: string
  /** Herald's MATCH_REPORT_SCHEMA — injected from the web app where it lives */
  schema: string
}

const AUDIT_TOOL_DESCRIPTION = `Forensic CV-to-JD match audit — a structured, evidence-based assessment of how well a candidate profile fits a job description.

The auditor evaluates hard requirements, surfaces detected signals from the candidate's work history, identifies gaps with mitigations, and produces a grade (A / A- / B+ / B) and recommendation.

Use this tool when:
- A recruiter wants an unbiased, evidence-driven match assessment before an interview
- You need to compare a candidate profile against a specific job description
- You want structured signal detection rather than a subjective opinion

Returns a MatchReport with:
- candidate: identity fields (name, title, github)
- hard_requirements: pass/fail check on explicit JD requirements
- grade: A | A- | B+ | B
- recommendation: one of Strong Fit / Good Fit / Possible Fit / No Fit
- confidence: High | Medium | Low
- confidence_reasoning: list of factors affecting confidence
- signal: detected evidence with observation, interpretation, and confidence
- gaps: honest gaps each paired with a mitigation strategy
- interview_hooks: suggested interview questions based on the profile`

/**
 * Creates and configures the Herald MCP server.
 *
 * Uses the low-level Server class to avoid TypeScript depth-limit issues
 * in McpServer's generic inference. Tool is registered with a plain
 * JSON Schema object so no Zod inference is needed at the server layer.
 */
export function createServer(credentials: HeraldMcpCredentials): Server {
  const server = new Server({ name: 'herald', version: '1.0.0' }, { capabilities: { tools: {} } })

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'herald__audit',
        description: AUDIT_TOOL_DESCRIPTION,
        inputSchema: {
          type: 'object' as const,
          properties: {
            profile: {
              type: 'string',
              description:
                'The formatted candidate profile. Include name, title, summary, skills, projects, and experience. Minimum 50 characters.',
              minLength: 50
            },
            jd: {
              type: 'string',
              description: 'The job description to match against. Minimum 20 characters.',
              minLength: 20
            }
          },
          required: ['profile', 'jd']
        }
      }
    ]
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params
    const args = request.params.arguments as Record<string, unknown>

    if (name === 'herald__audit') {
      const profile = args.profile
      const jd = args.jd

      if (typeof profile !== 'string' || profile.trim().length < 50) {
        return {
          content: [{ type: 'text' as const, text: 'Error: profile must be a string with at least 50 characters' }],
          isError: true
        }
      }

      if (typeof jd !== 'string' || jd.trim().length < 20) {
        return {
          content: [{ type: 'text' as const, text: 'Error: jd must be a string with at least 20 characters' }],
          isError: true
        }
      }

      try {
        const report = await run({
          profile: `${profile.trim()}\n\nJOB DESCRIPTION:\n${jd.trim()}`,
          modelId: credentials.modelId,
          vendor: credentials.vendor,
          apiKey: credentials.apiKey,
          schema: credentials.schema,
          candidateInfo: { name: '', title: '', github: '' }
        })

        if (!report) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: Audit returned no result. The LLM may have failed to produce a valid response.'
              }
            ],
            isError: true
          }
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(report, null, 2) }] }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true }
      }
    }

    throw new Error(`Unknown tool: ${name}`)
  })

  return server
}
