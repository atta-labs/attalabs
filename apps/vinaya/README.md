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
> commands (below). `npx vinaya init` is the planned one-command install; `init` / `doctor` /
> `upgrade` / `eject` are not implemented yet.

---

## 🖥️ Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| **Web** | [`web/`](web/) | `@atta/vinaya-web` | 🟢 Landing · `/install` (command reference) · `/start` (adopter's path — quick start + Ship with Vinaya) · `/docs` · Studio Portal |
| **CLI** | [`cli/`](cli/) | `@atta/vinaya-cli` | 🟠 Core commands live (below); installer commands pending |

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

> Not yet implemented: `init`, `doctor`, `upgrade`, `eject`.

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
