import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { runCompile } from './tools/compile'
import { runDeliberation } from './tools/run'
import { runListCatalog } from './tools/list-catalog'

const COMPILE_TOOL_DESCRIPTION = `Compile an arbitrary YAML deliberation spec to a Plan structure without executing it.

Use this to:
- Introspect what a YAML spec compiles to
- Debug spec authoring errors
- Visualize the execution DAG before running

Input:
- yaml: Raw YAML spec content
- customVars (optional): Handlebars template variables

Output:
- plan: Compiled Plan structure (JSON DAG)
- error: Compile error if validation failed`

const RUN_TOOL_DESCRIPTION = `Run a deliberation on an arbitrary YAML spec.

Use this to:
- Execute custom YAML specs without registering them in the catalog
- Test new deliberation workflows
- Run BYOYAML (bring your own YAML) workflows

Input:
- yaml: Raw YAML spec content
- question: The prompt/question to deliberate on
- customVars (optional): Handlebars template variables
- modelOverrides (optional): Override agent models

Output:
- content: Final synthesized conclusion
- structured: Parsed JSON when spec declares output_schema
- terminalState: CLEAN | REVISED | MAX_REVISIONS
- costBreakdown: Token counts and estimated USD cost`

const LIST_CATALOG_DESCRIPTION = `Discover registered deliberation specs in the Vāda catalog.

Use this to:
- Find available pre-registered specs
- Browse spec descriptions
- Filter by prefix (e.g., 'sparring' finds 'sparring-v1')

Input:
- prefix (optional): Filter specs by ID prefix

Output:
- specs: Array of {id, name, description}`

export function createServer(apiKey: string): Server {
  const server = new Server({ name: 'atta-engine-mcp', version: '1.0.0' }, { capabilities: { tools: {} } })

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'engine__compile',
        description: COMPILE_TOOL_DESCRIPTION,
        inputSchema: {
          type: 'object' as const,
          properties: {
            yaml: {
              type: 'string',
              description: 'Raw YAML spec content'
            },
            customVars: {
              type: 'object',
              description: 'Optional Handlebars template variables',
              additionalProperties: { type: 'string' }
            }
          },
          required: ['yaml']
        }
      },
      {
        name: 'engine__run',
        description: RUN_TOOL_DESCRIPTION,
        inputSchema: {
          type: 'object' as const,
          properties: {
            yaml: {
              type: 'string',
              description: 'Raw YAML spec content'
            },
            question: {
              type: 'string',
              description: 'The question or decision to deliberate on'
            },
            customVars: {
              type: 'object',
              description: 'Optional Handlebars template variables',
              additionalProperties: { type: 'string' }
            },
            modelOverrides: {
              type: 'object',
              description: 'Per-agent model overrides',
              additionalProperties: { type: 'string' }
            }
          },
          required: ['yaml', 'question']
        }
      },
      {
        name: 'engine__list_catalog',
        description: LIST_CATALOG_DESCRIPTION,
        inputSchema: {
          type: 'object' as const,
          properties: {
            prefix: {
              type: 'string',
              description: 'Optional prefix to filter specs'
            }
          }
        }
      }
    ]
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params
    const args = request.params.arguments as Record<string, unknown>

    try {
      if (name === 'engine__compile') {
        const result = await runCompile(args)
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }

      if (name === 'engine__run') {
        const result = await runDeliberation(args, apiKey)
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }

      if (name === 'engine__list_catalog') {
        const result = await runListCatalog(args)
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      }

      throw new Error(`Unknown tool: ${name}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true }
    }
  })

  return server
}
