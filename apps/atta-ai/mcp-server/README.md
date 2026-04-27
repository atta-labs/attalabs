# Atta Engine-as-MCP Server

Developer-facing MCP server that exposes `@atta/engine` as a primitive. Accepts arbitrary YAML deliberation specs and returns compilation + execution results. This is the "BYOYAML" (bring your own YAML) interface, distinct from Vāda's curated team product.

**Distinction from Vāda's MCP Server:**
- **Vāda's MCP** (`apps/vada-ai/mcp-server/`): Curated product. Pre-registered YAML specs, polished UX, end-user facing.
- **Engine-as-MCP** (this): Developer primitive. Raw engine, your YAML, your prompts. For developers building custom workflows.

---

## Tools

### `engine__compile`

Compile an arbitrary YAML spec to a Plan structure without executing it. Useful for introspection and debugging spec authoring.

**Input:**
- `yaml` (required): Raw YAML spec content
- `customVars` (optional): Handlebars template variables

**Output:**
```json
{
  "ok": true,
  "plan": { ... }
}
```

or on error:

```json
{
  "ok": false,
  "error": "Compile failed: agent 'critic' references unknown tool 'foo'"
}
```

### `engine__run`

Execute a full deliberation on an arbitrary YAML spec. Runs the compiled plan via the LangGraph adapter and returns the final conclusion with cost breakdown.

**Input:**
- `yaml` (required): Raw YAML spec content
- `question` (required): The question or decision to deliberate on
- `customVars` (optional): Handlebars template variables
- `modelOverrides` (optional): Per-agent model overrides (e.g., `{"default": "claude-opus-4-7"}`)

**Output:**
```json
{
  "ok": true,
  "content": "Conclusion text here...",
  "structured": { ... },
  "terminalState": "CLEAN",
  "costBreakdown": {
    "estimatedUsd": 0.015,
    "tokensInput": 1500,
    "tokensOutput": 300,
    "durationMs": 12000
  }
}
```

### `engine__list_catalog`

Discover registered specs in the Vāda catalog. Use to find pre-registered specs before writing your own YAML.

**Input:**
- `prefix` (optional): Filter specs by ID prefix (e.g., `"sparring"`)

**Output:**
```json
{
  "ok": true,
  "specs": [
    {
      "id": "sparring",
      "name": "Sparring",
      "description": "Two agents debate a question..."
    }
  ]
}
```

---

## Installation

Add to your Claude Desktop config or IDE MCP configuration:

```json
{
  "mcpServers": {
    "atta-engine": {
      "command": "bun",
      "args": ["run", "apps/atta-ai/mcp-server/src/index.ts"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-..."
      }
    }
  }
}
```

Or start locally:

```bash
cd apps/atta-ai/mcp-server
ANTHROPIC_API_KEY=sk-... bun start
```

---

## YAML Spec Format

Reference: [YAML Schema Reference](../../vada-ai/specs/yaml-schema-reference.md)

Example minimal spec:

```yaml
schemaVersion: "1.0"
id: my-custom-spec
displayName: My Custom Spec
description: Custom deliberation workflow
experimental: false
benchmarked: false
defaults:
  model: claude-sonnet-4-6
agents:
  - name: Strategist
    description: Maps decision landscape
    systemPrompt: |
      You are a strategic advisor. Map the decision landscape.
    tools: []
flow:
  kind: rounds
  rounds:
    - agents: [Strategist]
```

---

## Pattern Notes

- All tool implementations return structured `{ ok, ...result }` or `{ ok: false, error }` responses.
- Schema validation via Zod — malformed input returns validation error in the response.
- Cost breakdown uses Sonnet 4.6 pricing (configurable via `VADA_MODEL` env var, defaults to `claude-sonnet-4-6`).
- Streaming not supported in V1 — tools return once deliberation completes.

---

## Related

- [Engine skill](./.claude/skills/atta-engine/SKILL.md) — Plan compilation, types, rules
- [YAML authoring](./.claude/skills/vada-yaml-authoring/SKILL.md) — How to write specs
- [Vāda architecture](./.claude/skills/vada-architecture/SKILL.md) — Architecture overview
- Vāda's MCP server: `apps/vada-ai/mcp-server/`
