<!-- logo: figlet "ANSI Shadow" — regenerate with:  figlet -f "ANSI Shadow" "Vinaya" -->
```
██╗   ██╗██╗███╗   ██╗ █████╗ ██╗   ██╗ █████╗
██║   ██║██║████╗  ██║██╔══██╗╚██╗ ██╔╝██╔══██╗
██║   ██║██║██╔██╗ ██║███████║ ╚████╔╝ ███████║
╚██╗ ██╔╝██║██║╚██╗██║██╔══██║  ╚██╔╝  ██╔══██║
 ╚████╔╝ ██║██║ ╚████║██║  ██║   ██║   ██║  ██║
  ╚═══╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝
```

<div align="center">

# Vinaya

**Discipline for the AI era — deterministic checks every coding agent passes before merge.**

![status](https://img.shields.io/badge/status-bootstrap-972E2A?style=for-the-badge)
![domain](https://img.shields.io/badge/vinaya.attalabs.dev-121923?style=for-the-badge&logo=vercel&logoColor=white)

![web](https://img.shields.io/badge/web-Next.js_16-121923?style=flat-square&logo=nextdotjs&logoColor=white)
![cli](https://img.shields.io/badge/CLI-vinaya-972E2A?style=flat-square&logo=gnubash&logoColor=white)
![checks](https://img.shields.io/badge/gates-deterministic-972E2A?style=flat-square)

</div>

Vinaya is a **governance layer for AI coding agents** — a set of deterministic checks every agent
must satisfy before its work can merge. Same no-privileged interface for the four core AEG gates
and for the custom checks a repo defines itself. The forge-write path (`pr` / `issue`) validates
against a config-defined brief schema **locally, before any `gh` write** — so a malformed brief
is refused by contract, not caught in review.

*Vinaya* means **"discipline" / "the rules of conduct"** in Pāli. Part of the
[AttaLabs](../../README.md) ecosystem.

> **Bootstrap status** — landing + install pages are live and the CLI skeleton ships real
> commands (below). `npx @attalabs/vinaya init` is the one-command install; `init` / `doctor` /
> `upgrade` / `eject` are implemented and published.

---

## 🖥️ Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| **Web** | [`../vinaya-portal/web/`](../vinaya-portal/web/), [`../vinaya-studio/web/`](../vinaya-studio/web/) | `@atta/vinaya-portal-web`, `@atta/vinaya-studio-web` | 🟢 Portal (deployed): Landing · `/docs` (Harness, State Machine, `/docs/cli` command reference, Reference) · `/start` (adopter's path). Studio (local-only): `/studio` governance dashboard |
| **CLI** | [`cli/`](cli/) | `@attalabs/vinaya` | 🟢 Published to npm; core + installer commands live (below) |

---

## ⌨️ CLI commands

| Command | Does |
|---------|------|
| `vinaya help` · `version` | Command router + versioned `--json` envelope |
| `vinaya check <name> \| --all` | Run checks — `--json` · `--diff-only` · `--parallel`; wraps the four core AEG gates through the same interface as custom checks |
| `vinaya new check` | Scaffold a new custom check |
| `vinaya pr create \| edit` | Validated forge write — brief-schema check runs locally before any `gh` write |
| `vinaya issue create \| edit` | Same validated forge-write path for Issues |
| `vinaya studio` | Launch local Vinaya Studio against the current repo |

> Not yet implemented: `demo`, `waiver` (#387).

---

## 🚀 Getting started

```bash
# from the monorepo root
bun run dev:vinaya
```

---

## 📚 Documentation

- [CLAUDE.md](CLAUDE.md) — product overview + surface status
- [specs/vinaya-spec.md](specs/vinaya-spec.md) — product spec seed
- [Root CLAUDE.md](../../CLAUDE.md) — AttaLabs monorepo routing index
