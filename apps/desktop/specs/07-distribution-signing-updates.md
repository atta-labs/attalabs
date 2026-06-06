# 07 — Distribution, Signing & Auto-Update

This is the "new product surface" a hosted web app never needed. All of it is trodden in 2026 and CI-automatable, but it is a real subsystem — accounts, certificates, entitlements, a signing matrix, and an update channel.

## The reassurance first (re: Dani's Electron-era trauma)
The specific pain — *"we couldn't build for Windows without a Windows machine"* — is **gone**. The modern path is a **GitHub Actions cross-platform matrix**: `windows-latest`, `macos-latest` (Intel + Apple Silicon), `ubuntu-latest`; each platform builds and signs on its own runner. **You never touch a Windows machine.** Used in production by real Tauri apps (e.g. Fortuna). Typical loop: run a release command, push, wait ~15 min, publish — users get signed, notarized installers on every platform.

## macOS — mandatory, but automated
- Gatekeeper **requires sign + notarize**; unsigned apps can't run (not optional, unlike Windows).
- Need: **Apple Developer Program** ($99/yr) + a **Developer ID Application** certificate (account-holder creates it).
- Tauri notarizes automatically during build via env vars (Apple ID + app-specific password, or App Store Connect API key). Notarization adds **2–5 min/build**.
- **🔴 Entitlements for shell-out (the CLI transport):** an app that spawns `claude` needs `com.apple.security.cs.allow-unsigned-executable-memory` + `com.apple.security.cs.disable-library-validation` (and `allow-jit` for the WebView), or Gatekeeper blocks the subprocess. Ties directly to `04-cli-transport.md` and the PATH issue.

## Windows — cloud signing, no hardware dongle
- Signing is **not required to run** (unlike macOS) but **avoids the SmartScreen warning** and enables Microsoft Store listing.
- The old EV-cert-on-USB-dongle nightmare is replaced by **Azure Trusted Signing** (cloud, via `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET`). OV certs also work. SmartScreen reputation builds over time.

## Auto-update (a THIRD signing layer)
Tauri ships an updater plugin. On launch the app pings an endpoint serving `latest.json` (version, notes, URL, signature); if newer, it downloads, **verifies the signature**, replaces the binaries, and restarts.
- Needs its **own signing keypair**, separate from OS code-signing (`tauri signer generate` → `TAURI_SIGNING_PRIVATE_KEY` + password; public key embedded in `tauri.conf.json`; `createUpdaterArtifacts: true`).
- Endpoint can be a **static `latest.json` on GitHub Releases** (free; `tauri-action` uploads it in CI), or CrabNebula Cloud, or your own server.
- **Windows wrinkle:** the running binary can't be replaced while active; choose `installMode` (`passive`/`quiet`).

## The cumulative signing reality
Three signature systems: **Apple notarization + Windows (Azure) + Tauri updater keypair.** One walkthrough tallies the full signed + notarized + auto-updating pipeline at **~11 GitHub secrets** — "a lot, but you set them once."

## Reference
A community **Tauri code-signing skill** (dchuk/claude-code-tauri-skills) walks signing + notarization for macOS/Windows step-by-step and maps the CI env vars — use it as the basis for the implementation runbook when we build.
