# Herald AI

Forensic CV-to-job-description match tool. Part of the [Atta AI](../../README.md) ecosystem.

**Domain:** herald.ai

## Surfaces

- **Web** (`web/`) — Next.js 16 app serving the Herald Portal and Envoy pages
- **Mobile** (`mobile/`) — React Native app (not yet implemented)
- **MCP** (`mcp/`) — MCP server with CV parsing and match engine tools

## Getting Started

```bash
# From monorepo root
bun run dev:herald
```

## Documentation

- [Build Spec](web/docs/BUILD-SPEC.md) — Complete build specification
- [Architecture](web/docs/ARCHITECTURE.md) — Architecture decisions
