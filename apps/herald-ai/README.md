<!-- logo: figlet "ANSI Shadow" — regenerate with:  figlet -f "ANSI Shadow" "Herald" -->
```
██╗  ██╗███████╗██████╗  █████╗ ██╗     ██████╗
██║  ██║██╔════╝██╔══██╗██╔══██╗██║     ██╔══██╗
███████║█████╗  ██████╔╝███████║██║     ██║  ██║
██╔══██║██╔══╝  ██╔══██╗██╔══██║██║     ██║  ██║
██║  ██║███████╗██║  ██║██║  ██║███████╗██████╔╝
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═════╝
```

<div align="center">

# Herald

**Forensic CV ↔ job-description match — evidence-based audit reports, not vibes.**

![status](https://img.shields.io/badge/status-active-E11D48?style=for-the-badge)
![domain](https://img.shields.io/badge/herald.attalabs.dev-000000?style=for-the-badge&logo=vercel&logoColor=white)

![web](https://img.shields.io/badge/web-Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![mcp](https://img.shields.io/badge/MCP-server-E11D48?style=flat-square)
![mobile](https://img.shields.io/badge/mobile-planned-6B7280?style=flat-square)
![auditor](https://img.shields.io/badge/Skeptical_Auditor-Claude_Sonnet-E11D48?style=flat-square)

</div>

Herald gives any professional a deployed subdomain with an AI-powered **Forensic Match Audit**.
A recruiter pastes a job description; Herald returns a structured, **evidence-based** match
report — every claim tied to a detectable signal, tiered by verifiability, and graded by a
**Skeptical Auditor** that refuses credit the CV doesn't back up.

- **Zero marketing language** — signals only, no filler.
- **Hard vs soft requirements** — a missing *hard* requirement forces a code-enforced `NO FIT`,
  never left to the model to decide.
- **GitHub evidence** — the auditor can pull identity-filtered commit/PR signals (file patterns
  and structure only, never code) to back its claims.
- **Grades:** `A` · `A-` · `B+` · `B` · `STRETCH` · `NO FIT`.

Part of the [AttaLabs](../../README.md) ecosystem. *Herald* (Pāli root) — **"announcement."**

---

## 🖥️ Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| **Web** | [`web/`](web/) | `@atta/herald-ai-web` | 🟢 Active — Herald Portal + Envoy pages |
| **MCP** | [`mcp/`](mcp/) | `@atta/herald-ai-mcp` | 🟢 Active — CV parsing + match-engine tools |
| **Mobile** | `mobile/` | `@atta/herald-ai-mobile` | ⚪ Planned (React Native) |

The audit engine lives in `@atta/forensic-hiring-auditor` (wraps `@atta/engine` +
`@atta/adapter-langgraph`). Herald's route owns auth, BYOK credentials, caching, and the
retry/timeout wrapper; the package owns the auditor's prompt, model, and the GitHub signal tool.

---

## 🚀 Getting started

```bash
# from the monorepo root
bun run dev:herald
```

---

## 📚 Documentation

| Doc | Purpose |
|-----|---------|
| [web/CLAUDE.md](web/CLAUDE.md) | Web app architecture and rules |
| [mcp/CLAUDE.md](mcp/CLAUDE.md) | MCP server architecture |
| [web/docs/BUILD-SPEC.md](web/docs/BUILD-SPEC.md) | Complete build specification |
| [web/docs/ARCHITECTURE.md](web/docs/ARCHITECTURE.md) | Architecture decisions |
