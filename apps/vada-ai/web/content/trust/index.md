---
title: "Trust · Vāda"
description: "How Vāda handles your API keys — the current BYOK architecture."
section: Architecture
---

# Vāda · <span className="text-accent">BYOK</span> Architecture

## The promise

Your provider API keys are stored on Vāda's servers, <span className="text-accent">encrypted at rest</span>, and decrypted only inside the request that uses them. When the request ends, the plaintext key leaves memory. The plaintext is never logged, never returned in a response, never persisted to disk. The encryption is bound to your user identity, so the only way to decrypt your keys is in the context of an authenticated request from you.

This is not a policy we follow. It's how the system is built.

## What changed in May 2026

Earlier versions of Vāda kept your keys in your browser only — encrypted with a passkey, stored in IndexedDB, and sent to our server only as part of each deliberation request. We never persisted them. That model was strictly stronger for at-rest privacy, but it had one structural limitation: it required you to be in your browser. An AI assistant connecting to Vāda from a different machine — say, Claude.ai using our hosted MCP server — has no access to your browser's encrypted store.

When we shipped hosted MCP in May 2026, we had to choose: stay browser-only and skip hosted MCP, or accept a deliberate trust escalation. We chose the latter. This page describes the resulting architecture honestly.

## Where your keys live, end-to-end

### At rest

Your keys are stored in Vāda's database in the `user_provider_keys` table — one row per provider per user. The key material is <span className="text-accent">envelope-encrypted</span> with AES-256-GCM. The encryption uses Additional Authenticated Data (AAD) bound to your Clerk user ID, so a row swap between users is detectable on decrypt.

The master encryption key is held in our production environment as an environment variable. A future version will migrate this master key to a managed KMS; the schema already reserves a `kms_key_id` column to support per-row migration without breaking existing ciphertexts.

### In memory, during a request

When you click Deliberate (or when an MCP client makes a tool call):

1. The server authenticates the request — Clerk session for the web app, bearer token (Vāda API key) for hosted MCP.
2. The server reads the encrypted key row(s) needed for the request.
3. The server decrypts each key in the request handler, instantiates the provider SDK with the plaintext, and makes the LLM call.
4. The plaintext key leaves scope. The handler returns. Garbage collection cleans up.

The plaintext key is <span className="text-accent">never</span> logged, <span className="text-accent">never</span> returned in a response body or error payload, <span className="text-accent">never</span> written to a database column or cache, <span className="text-accent">never</span> included in error tracking payloads. It exists only as a Node.js variable inside one request handler, for the duration of that one request.

### Other paths

- **Probe** (validating a key when you save it) — your browser calls the provider directly to check the key is responsive. The server doesn't see the key in this path.
- **Ollama discovery** — your browser calls `localhost:11434` directly. Vāda doesn't see your local Ollama setup.

## What Vāda stores

So you know exactly where the line is, here's what Vāda's servers persist:

- Your deliberation questions and round transcripts
- Conclusions and structured synthesis output
- Your account metadata via Clerk (Clerk ID, email)
- Model assignments per agent (in localStorage, not the DB)
- Encrypted provider API keys (the rows in `user_provider_keys`)
- Vāda API keys for hosted MCP, hashed with SHA-256 (the rows in `api_keys`)
- Hosted MCP session logs (which tools were called, when)

## Your threat model — explicit accounting

A Vāda operator with database access alone <span className="text-accent">cannot read your keys</span>. They would need both database access AND the master encryption key to decrypt. The encryption is real, not theatrical.

A Vāda operator with database access AND the master key can decrypt your keys. This is true. Two-key compromise is required.

A Vāda compromise during an active request can expose any keys decrypted in that handler's memory. This is the same as before for in-flight requests — but now it's a category we ship intentionally rather than a known caveat.

A subpoena reaching Vāda for stored data CAN compel decryption. Pre-May-2026 there was nothing at rest to compel. This is honest, not a dealbreaker.

Hosted MCP API keys are distinct from provider keys. API keys (`vada_*`) are bearer tokens used to authenticate MCP clients. They're hashed with SHA-256 — the keys have 256 bits of randomness, which makes brute-force infeasible. You generate them in Settings → API Keys and revoke them individually.

## Cross-device behavior

Because keys are now stored server-side, switching devices is transparent. Sign in on a new device — your keys are already there. This is a behavior change from the prior model, where each device had its own IndexedDB copy.

## Key rotation

Rotate at the provider, then update in Vāda Settings → API Keys. Vāda has no visibility into upstream rotation events.

## How to verify these claims

If you want to audit our claims yourself:

- The hosted MCP route handler is at `apps/vada-ai/web/src/app/api/mcp/route.ts`. It does bearer auth, decryption, tool dispatch in one file.
- Bearer validation: `packages/auth/src/api-key-auth.ts`'s `verifyApiKeyBearer` function. SHA-256 hash + DB lookup.
- Envelope encryption: `packages/crypto/`. AES-256-GCM with AAD = clerkId.
- DB schemas: `packages/db/src/schema/keys.ts`.
- Web app deliberation route: `apps/vada-ai/web/src/app/api/deliberation/[id]/workflow/run/route.ts`. Reads keys from DB by `clerkId`; doesn't accept keys in the request body.

If anything in this page is contradicted by the code, that's a critical bug we want to know about.
