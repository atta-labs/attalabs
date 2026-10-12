---
title: "Trust · Vāda"
description: "What Vāda stores, what it sends where, and how your keys are protected."
section: Trust
---

# How Vāda handles your <span className="text-primary">data</span>

## In short

- **What we store:** your questions, every reviewer's output, the conclusions, your model choices, and your provider keys encrypted at rest.
- **What we send where:** your question and the transcript go to the AI providers whose keys you assign to a slot. Web search queries go to a search provider.
- **Who pays for what:** model calls run on your own provider keys. Web search for non-Anthropic models runs on Vāda's search accounts.
- **What you can delete:** your provider keys and your Vāda API keys, any time, in Settings.
- **How to verify:** every claim below points at the code that implements it.

## Your provider keys

You bring your own keys. Vāda stores them on its servers because hosted MCP needs them: an assistant calling Vāda from another machine has no access to your browser.

**At rest.** All your provider keys sit in one database row (`user_provider_keys`), bundled into a single <span className="text-primary">envelope-encrypted</span> payload: AES-256-GCM, with the data key itself encrypted by a master key. The encryption is bound to your user ID (as Additional Authenticated Data), so swapping one user's row onto another fails on decrypt. The master key is held in the production environment as an environment variable.

**When you save a key.** Your browser first calls the provider directly to check the key works. The key is then sent to Vāda once, over TLS, and encrypted on arrival.

**When a key is used.** The server authenticates the request (your session in the web app, a Vāda API key for hosted MCP), decrypts the keys it needs, and calls the provider. A deliberation keeps running after the page request returns, so the key stays in memory until that deliberation finishes. Plaintext keys are not written to the database, not returned in responses, and not deliberately logged.

**Who can decrypt.** Database access alone is not enough: decrypting needs the database and the master key. An operator holding both, or a legal order served on Vāda, can decrypt stored keys. A compromise of the server while a deliberation runs can expose the keys in use at that moment.

**Across devices.** Keys live on the server, so they follow your account to any device you sign in on.

**Rotation.** Rotate a key at the provider, then replace it in Settings → Provider API Keys. Vāda cannot see rotations upstream.

**Local models.** Ollama discovery runs in your browser against `localhost:11434`. Vāda never sees your local setup.

## Hosted MCP

- You authenticate an MCP client with a Vāda API key (`vada_…`), created and revoked one by one in Settings → Vāda API Keys. Keys carry 256 bits of randomness and are stored only as a SHA-256 hash.
- Over MCP, Vāda uses your Anthropic, Google, OpenAI and xAI keys. Keys you saved for other providers are not used by MCP calls.
- Each MCP consultation is stored in full: the prompt and any context you pass, every reviewer's response, the transcript, the synthesis, token counts and cost. Records are private to your account.

## What data goes where

| Data | Goes to | On whose account |
|---|---|---|
| Your question, context, the transcript so far | Each AI provider assigned to a slot | Yours (your key) |
| Search queries written by a model | Google Custom Search, falling back to Tavily, for GPT, Grok and Groq models | Vāda's |
| Search by Anthropic models | Anthropic's own web search | Yours (your key) |
| Everything in "What Vāda stores" | Vāda's database (Neon Postgres) | Vāda's |
| Your sign-in and email | Clerk | Vāda's |

## What Vāda stores

- Your deliberation questions and every round's transcript
- Conclusions and structured synthesis output
- Full records of hosted MCP consultations (see above)
- Model assignments per slot (`user_team_models`)
- Encrypted provider keys (`user_provider_keys`)
- Hashed Vāda API keys (`api_keys`)
- Your account metadata via Clerk (user ID, email)

## Retention and deletion

- Deliberations and MCP records are kept until removed; there is no automatic expiry.
- You can delete each provider key and revoke each Vāda API key yourself, in Settings.
- Deleting individual deliberations is not self-serve yet. You can download a full transcript of any deliberation from its page.

## Subprocessors

Clerk (sign-in), Neon (database), Vercel (hosting), Google and Tavily (web search for some models), and the AI providers you choose.

## Scope

These keys are Vāda's. Other AttaLabs products do not read them.

## Verify it yourself

- Envelope encryption: `packages/crypto/src/envelope.ts` (AES-256-GCM, AAD bound to the user ID)
- Key storage schema: `packages/db/src/schema/keys.ts`
- Saving a key: `apps/vada-ai/web/src/app/api/keys/provider/route.ts`
- Web deliberations read keys by user, never from the request body: `apps/vada-ai/web/src/app/api/deliberation/[id]/workflow/run/route.ts`
- Hosted MCP auth and key decryption: `apps/vada-ai/web/src/app/api/mcp/route.ts`; API key checks: `packages/auth/src/api-key-auth.ts`
- What an MCP consultation stores: `packages/db/src/schema/mcp.ts`
- Web search providers: `packages/adapter-langgraph/src/web-search-handler.ts`

If anything here is contradicted by the code, that is a bug we want to hear about.
