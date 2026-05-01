---
title: "Trust · Vāda"
description: "How Vāda handles your API keys — the BYOK architecture."
section: Architecture
---

# Vāda · <span className="text-accent">BYOK</span> Architecture Principles

## The promise

Your keys are never stored in our database. They are never written to any log. They exist on our server <span className="text-accent">only in memory</span>, only during the single request that uses them, and only long enough to make your API call. This is not a policy we follow — it is a <span className="text-accent">structural fact</span> about how the product is built.

## What that means, concretely

### Your keys stay in your browser

When you add an Anthropic, OpenAI, Google, or any other model provider's API key to Vāda, that key is stored on your machine. Depending on your setup:

- **<span className="text-accent">Passkey-secured mode</span>:** your keys are encrypted with an encryption key derived from your passkey (Touch ID / Face ID / Windows Hello / hardware key) and stored in your browser's IndexedDB. Only your biometric can decrypt them.
- **<span className="text-accent">Session-only mode</span>:** your keys live in your browser's memory for the duration of your session. When you close the tab, they are gone.

In both modes, the keys live on your device between deliberations. They transit our server only during the deliberation request itself (see the next section).

### In memory, not in storage

When a deliberation runs, your key is sent from your browser to Vāda's server in the POST body of the deliberation start request. The server holds the key in memory, passes it to the model provider (Anthropic, OpenAI, etc.) to authenticate the API calls, then discards it. The key is <span className="text-accent">never written to disk</span>, <span className="text-accent">never logged</span>, <span className="text-accent">never persisted to the database</span>, and is garbage-collected when the request ends. Transit is over HTTPS. The same applies to benchmark calls: the baseline single-shot and AI judge requests transit server memory under the same contract.

What Vāda's servers do see: the text of the model responses, which is stored as your deliberation transcript. The server constructs prompts, runs the agent orchestration, and calls the provider — your key authorizes those calls but is <span className="text-accent">not retained once they complete</span>.

### The database has no place for your keys

There is <span className="text-accent">no column, table, or field</span> anywhere in Vāda's database for API keys, provider credentials, or secrets. Even if a team member wanted to store a key server-side, they couldn't — the schema doesn't support it. We can audit this. You can audit this. The codebase is set up so that storing a user's API key server-side is <span className="text-accent">structurally impossible</span> without a deliberate architectural change.

### No logs contain your keys

Server logs, error reports, and analytics capture request metadata, not request body content — because your keys are never written to any log sink, only held in process memory for the duration of the request. Langfuse traces (our observability layer) are configured with a `SensitiveDataFilter` that redacts any field named `apiKey` before it leaves the process.

## What Vāda does store

So you understand exactly where the line is, here's what Vāda's servers actually persist:

- Your deliberation questions
- The transcripts of each round (what each agent said)
- The conclusions produced (recommendation, key condition, unresolved points)
- The terminal state of each deliberation (Clean / Revised / Unconverged)
- Your user account metadata (email, authentication identifiers, preferences)
- The models you've assigned to each agent role (but not the keys that authorize those models)

All of the above is the content of the deliberation work you did using Vāda. None of it is the credentials you used to do it.

## What this costs you

The structural BYOK architecture has real tradeoffs. We think they're worth it, but you should know them:

- **Browser-bound keys.** If you switch browsers or devices, you re-enter your keys (or unlock with a passkey synced through your OS / password manager). There is no "server-side sync" of keys because there is no server-side copy.
- **No credential recovery.** If you delete your passkey, clear your browser data, or lose your device without a synced passkey, your stored encrypted keys are unrecoverable. We cannot reset or restore them because we never had them.
- **You are responsible for key rotation.** If your API key is compromised — on any site, not just Vāda — you rotate it at the provider and update it in Vāda. We can't help you there because we can't see what key you're using.

## Using Vāda across devices

Because your keys live on your device rather than on our servers, each device you use Vāda on is a sovereign identity.

**First time on a new device:** Enter your API keys once. Optionally set up a passkey on the new device to unlock biometrically on return visits. The whole process takes under a minute.

**Switching between devices frequently:** Use a password manager (1Password, Bitwarden, iCloud Keychain, Google Password Manager) to store your API keys. Pasting a key from your password manager into a new device is the same workflow you likely already use for other sensitive credentials.

**Sync between your own devices:** We're working on an end-to-end encrypted device-linking flow that lets you sync your keys between devices you own — through a QR code scan, with the encryption happening entirely between your devices, never through our server. Until that ships, treat each device as its own setup.

We chose not to offer server-side encrypted sync even though it would be cryptographically defensible. "Your keys are encrypted in our database" is a weaker story than "your keys never reach our storage." We prefer the stronger story — and the architectural constraint that enforces it.

## Why this architecture

<span className="text-accent">BYOK</span> products that store your keys server-side — even in encrypted form — create <span className="text-accent">attack surface</span>. A database breach, a rogue employee, a misconfigured log, a subpoena, a legal compulsion. None of those can expose what doesn't exist in storage. By designing Vāda so keys are <span className="text-accent">never written to any storage layer</span> — only held in process memory for the duration of a single request — we take those risks off the table structurally.

This also preserves your relationship with the model providers. Your Anthropic bill is yours. Your usage metrics at OpenAI are yours. Your rate limits are yours. Vāda is <span className="text-accent">not a middleman</span>; it's an orchestration layer on top of tools you already own.

## Why this changed

Earlier versions of Vāda made API calls directly from your browser to model providers. We moved these calls server-side because the new architecture (Mastra workflow orchestration) requires server-side execution to produce accurate traces, coordinate multi-agent deliberations reliably, and give you a better experience.

The privacy tradeoff: your key now transits our server memory during each deliberation. We protected this by ensuring the key is never written to any storage, never logged, and is dropped as soon as the request completes. This is a stronger posture than most BYOK products, just architecturally different from our earlier one.

## How to verify our claims

- **Check the database schema.** Drizzle schema files in the repository contain every table and column. Search for `api_key`, `credential`, `token` — you won't find any.
- **Check the identity package.** The `@atta/identity` package source is open for inspection. Look at where keys are stored (`packages/identity/src/storage.ts`) and where they're read. Trace the call graph — the key is sent to exactly one destination: Vāda's `/workflow/run` endpoint. No analytics, no telemetry, no error reporters, no third-party sinks.
- **Check the workflow route.** `/api/deliberation/[id]/workflow/run` is the only route that accepts a key. Read the source — you'll see the key flowing to provider calls and never to storage.
- **Check the network tab.** You'll see the deliberation start as a POST to Vāda's `/api/deliberation/[id]/workflow/run` (the POST body contains your key), then an SSE stream back. The server uses your key to make provider calls on your behalf — those calls happen server-side, not in your browser. You can verify what the server does with your key by inspecting the workflow endpoint source code, which is in the repository.
- **Check the observability config.** Our Langfuse integration includes a `SensitiveDataFilter` that redacts `apiKey` from all traces before they leave the process.

If any of the above is untrue, that is a critical security bug and we want to know about it.

---

*The BYOK promise is worth nothing if it's just a policy. We made the database constraint structural because policies can slip and schemas cannot. The server-transit model is honest: your key enters our process, does its job, and leaves. No storage. No logs. No copies.*
