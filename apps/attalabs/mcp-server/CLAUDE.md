# Atta Engine-as-MCP Server

Developer-facing MCP primitive exposing `@atta/engine` for BYOYAML (bring your own YAML) workflows.

**Distinction:** This is NOT a user-facing product. Vāda's MCP server (`apps/vada-ai/mcp-server/`) is the curated, end-user product with pre-registered specs. This is raw engine for developers.

---

## Architecture

```
Client Request
    ↓
server.ts (tool registration + dispatch)
    ↓
tools/{compile,run,list-catalog}.ts (business logic)
    ↓
@atta/engine (compile YAML → Plan)
    ↓
@atta/adapter-langgraph (execute Plan)
    ↓
Response (JSON)
```

---

## File Structure

```
src/
├── index.ts                  Entry point; env validation; connects transport
├── server.ts                 Tool registration + request handler dispatch
├── schema.ts                 Zod validation schemas (3 tools)
└── tools/
    ├── compile.ts            engine__compile: YAML → Plan (no execution)
    ├── run.ts                engine__run: YAML + question → conclusion
    └── list-catalog.ts       engine__list_catalog: discover Vāda specs
```

---

## Patterns

### Error Handling
All tools return structured responses:
```ts
interface ToolOutput {
  ok: boolean
  ...result?
  error?: string
}
```

Never throw from tool handlers; return `{ ok: false, error }`.

### Schema Validation
Three Zod schemas in `schema.ts`:
- `CompileInputSchema`
- `RunInputSchema`
- `ListCatalogInputSchema`

Each tool parses input first; validation errors return structured error response.

### Cost Breakdown
`run.ts` calculates:
- Estimated USD (configurable pricing, hardcoded for Sonnet 4.6)
- Token counts
- Duration in ms

Model configurable via `VADA_MODEL` env var.

### No Session Logging
Unlike Vāda's MCP server, this does NOT log sessions to Postgres. It's a developer tool, not a product UI. Add session logging if required in future.

---

## Adding a New Tool

1. Create `src/tools/{tool-name}.ts` exporting `run{ToolName}(input, apiKey?): Promise<ToolOutput>`
2. Add Zod schema to `src/schema.ts`
3. Register in `server.ts`:
   - Add tool to `ListToolsRequestSchema` handler
   - Add dispatch case in `CallToolRequestSchema` handler
4. Update README.md with tool docs
5. Typecheck + lint

---

## Testing

No test harness. Smoke test manually:

```bash
ANTHROPIC_API_KEY=sk-... bun start

# In another terminal, use Claude Desktop or MCP test client
# engine__compile: send raw YAML, verify plan returned
# engine__run: send YAML + question, verify conclusion returned
# engine__list_catalog: verify catalog discovery works
```

---

## Known Limitations

- Streaming not supported — tools return once deliberation completes
- No session logging (intentional — this is a developer tool)
- Model overrides only support 'default' key (can extend per-agent in future)
- No authentication — intended for local development only

---

## Future Work

Track A (YAML Visualizer) will likely consume this MCP's tools for a frontend YAML editor with real-time compilation preview.

---

## Related Skills

- `.claude/skills/atta-engine/SKILL.md` — engine internals, Plan types, compilation rules
- `.claude/skills/vada-yaml-authoring/SKILL.md` — YAML spec format and authoring
- `.claude/skills/code-style/SKILL.md` — project code conventions
- `.claude/skills/monorepo-structure/SKILL.md` — package imports, workspace layout
