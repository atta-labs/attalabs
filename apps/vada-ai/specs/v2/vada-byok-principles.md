# Vāda · BYOK Architecture Principles

## The promise

You bring your own API keys. Vāda never sees them, never stores them, never transmits them. This is not a policy we follow — it is a structural fact about how the product is built.

## What that means, concretely

### Your keys stay in your browser

When you add an Anthropic, OpenAI, Google, or any other model provider's API key to Vāda, that key is stored on your machine. Depending on your setup:

- **Passkey-secured mode:** your keys are encrypted with an encryption key derived from your passkey (Touch ID / Face ID / Windows Hello / hardware key) and stored in your browser's IndexedDB. Only your biometric can decrypt them.
- **Session-only mode:** your keys live in your browser's memory for the duration of your session. When you close the tab, they are gone.

In both modes, the keys exist only on the device in front of you.

### Vāda's servers never touch your keys

When a deliberation runs, API calls to model providers (Anthropic, OpenAI, Google, Mistral, DeepSeek, xAI, Meta, etc.) are made **directly from your browser**, not from Vāda's servers. Your browser authenticates to the provider using your key. Vāda's servers never see the key, never proxy the request, never intercept the response in transit.

What Vāda's servers do see: the text of the responses your browser received, which gets stored as part of your deliberation history. The server orchestrates which agent runs next and constructs the prompts — but the actual API call, with your credentials, happens on your device.

### The database has no place for your keys

There is no column, table, or field anywhere in Vāda's database for API keys, provider credentials, or secrets. Even if a team member wanted to store a key server-side, they couldn't — the schema doesn't support it. We can audit this. You can audit this. The codebase is set up so that storing a user's API key server-side is structurally impossible without a deliberate architectural change.

### No logs contain your keys

Server logs, error reports, analytics — none of these touch your API keys, because the keys never reach the server in the first place. The only logging that could ever involve your keys would be on your own device, in your browser's dev tools. That's your machine, your control.

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

We chose not to offer server-side encrypted sync even though it would be cryptographically defensible. "Your keys are encrypted in our database" is a weaker story than "your keys never reach our database." We prefer the stronger story — and the architectural constraint that enforces it.

## Why this matters

BYOK products that still touch your keys server-side — even in encrypted form, even temporarily — create attack surface. A database breach, a rogue employee, a misconfigured log, a subpoena, a legal compulsion. None of those can expose what doesn't exist. By designing Vāda so the server never receives keys, we take those risks off the table structurally.

This also preserves your relationship with the model providers. Your Anthropic bill is yours. Your usage metrics at OpenAI are yours. Your rate limits are yours. Vāda is not a middleman; it's an orchestration layer on top of tools you already own.

## Audit trail

You can verify every claim on this page:

- **Client code:** the identity package source is open for inspection. Look for where keys are written (`packages/identity/src/storage.ts`) and where they're read (hooks). Trace the call graph; you'll never find a `fetch` to Vāda's server that includes key material.
- **Server schema:** the Drizzle schema defines every table and column. There is no key-like field anywhere in it. Grep the schema for `api_key`, `credential`, `secret`, `token` — you will find nothing.
- **Server routes:** no server route accepts an API key as input. Check the route handlers and input schemas; none of them will have a provider key field.
- **Network tab:** open your browser's developer tools during a deliberation. Watch the requests. You'll see calls going directly from your browser to `api.anthropic.com`, `api.openai.com`, etc. — not through Vāda's servers.

If you find any of the above to be untrue, that is a critical security bug and we want to know about it immediately.

---

*The BYOK promise is worth nothing if it's just a policy. We made it structural because policies can slip. Architecture cannot.*
