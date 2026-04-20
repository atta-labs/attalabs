// /trust — BYOK architecture principles.
// Source of truth: apps/vada-ai/specs/vada-byok-principles.md
// This copy is locked — do not paraphrase. If the architecture changes, update here too.

import { Heading, Text } from '@atta/ui/shared'

export const metadata = {
  title: 'Trust · Vāda',
  description: 'How Vāda handles your API keys — the BYOK architecture.'
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <Heading level={1} className='mt-0 font-serif text-4xl font-light leading-tight'>
      {children}
    </Heading>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <Heading level={2} className='mt-12 mb-4 font-serif text-2xl font-light leading-tight'>
      {children}
    </Heading>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <Heading level={3} className='mt-8 mb-3 font-serif text-xl font-light leading-snug'>
      {children}
    </Heading>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Text as='p' className='my-4 text-base leading-relaxed text-foreground/90'>
      {children}
    </Text>
  )
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className='my-4 list-disc space-y-2 pl-6 text-foreground/90'>{children}</ul>
}

export default function TrustPage() {
  return (
    <article className='mx-auto w-full max-w-3xl space-y-2 px-6 py-12'>
      <span className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Architecture</span>
      <H1>Vāda · BYOK Architecture Principles</H1>

      <H2>The promise</H2>
      <P>
        Your keys are never stored in our database. They are never written to any log. They exist on our server only in
        memory, only during the single request that uses them, and only long enough to make your API call. This is not a
        policy we follow — it is a structural fact about how the product is built.
      </P>

      <H2>What that means, concretely</H2>

      <H3>Your keys stay in your browser</H3>
      <P>
        When you add an Anthropic, OpenAI, Google, or any other model provider's API key to Vāda, that key is stored on
        your machine. Depending on your setup:
      </P>
      <UL>
        <li>
          <strong>Passkey-secured mode:</strong> your keys are encrypted with an encryption key derived from your
          passkey (Touch ID / Face ID / Windows Hello / hardware key) and stored in your browser's IndexedDB. Only your
          biometric can decrypt them.
        </li>
        <li>
          <strong>Session-only mode:</strong> your keys live in your browser's memory for the duration of your session.
          When you close the tab, they are gone.
        </li>
      </UL>
      <P>
        In both modes, the keys live on your device between deliberations. They transit our server only during the
        deliberation request itself (see the next section).
      </P>

      <H3>In memory, not in storage</H3>
      <P>
        When a deliberation runs, your key is sent from your browser to Vāda's server in the POST body of the
        deliberation start request. The server holds the key in memory, passes it to the model provider (Anthropic,
        OpenAI, etc.) to authenticate the API calls, then discards it. The key is never written to disk, never logged,
        never persisted to the database, and is garbage-collected when the request ends. Transit is over HTTPS.
      </P>
      <P>
        What Vāda's servers do see: the text of the model responses, which is stored as your deliberation transcript.
        The server constructs prompts, runs the agent orchestration, and calls the provider — your key authorizes those
        calls but is not retained once they complete.
      </P>

      <H3>The database has no place for your keys</H3>
      <P>
        There is no column, table, or field anywhere in Vāda's database for API keys, provider credentials, or secrets.
        Even if a team member wanted to store a key server-side, they couldn't — the schema doesn't support it. We can
        audit this. You can audit this. The codebase is set up so that storing a user's API key server-side is
        structurally impossible without a deliberate architectural change.
      </P>

      <H3>No logs contain your keys</H3>
      <P>
        Server logs, error reports, and analytics capture request metadata, not request body content — because your keys
        are never written to any log sink, only held in process memory for the duration of the request. Langfuse traces
        (our observability layer) are configured with a <code className='font-mono text-sm'>SensitiveDataFilter</code>{' '}
        that redacts any field named <code className='font-mono text-sm'>apiKey</code> before it leaves the process.
      </P>

      <H2>What Vāda does store</H2>
      <P>So you understand exactly where the line is, here's what Vāda's servers actually persist:</P>
      <UL>
        <li>Your deliberation questions</li>
        <li>The transcripts of each round (what each agent said)</li>
        <li>The conclusions produced (recommendation, key condition, unresolved points)</li>
        <li>The terminal state of each deliberation (Clean / Revised / Unconverged)</li>
        <li>Your user account metadata (email, authentication identifiers, preferences)</li>
        <li>The models you've assigned to each agent role (but not the keys that authorize those models)</li>
      </UL>
      <P>
        All of the above is the content of the deliberation work you did using Vāda. None of it is the credentials you
        used to do it.
      </P>

      <H2>What this costs you</H2>
      <P>The structural BYOK architecture has real tradeoffs. We think they're worth it, but you should know them:</P>
      <UL>
        <li>
          <strong>Browser-bound keys.</strong> If you switch browsers or devices, you re-enter your keys (or unlock with
          a passkey synced through your OS / password manager). There is no "server-side sync" of keys because there is
          no server-side copy.
        </li>
        <li>
          <strong>No credential recovery.</strong> If you delete your passkey, clear your browser data, or lose your
          device without a synced passkey, your stored encrypted keys are unrecoverable. We cannot reset or restore them
          because we never had them.
        </li>
        <li>
          <strong>You are responsible for key rotation.</strong> If your API key is compromised — on any site, not just
          Vāda — you rotate it at the provider and update it in Vāda. We can't help you there because we can't see what
          key you're using.
        </li>
      </UL>

      <H2>Using Vāda across devices</H2>
      <P>
        Because your keys live on your device rather than on our servers, each device you use Vāda on is a sovereign
        identity.
      </P>
      <P>
        <strong>First time on a new device:</strong> Enter your API keys once. Optionally set up a passkey on the new
        device to unlock biometrically on return visits. The whole process takes under a minute.
      </P>
      <P>
        <strong>Switching between devices frequently:</strong> Use a password manager (1Password, Bitwarden, iCloud
        Keychain, Google Password Manager) to store your API keys. Pasting a key from your password manager into a new
        device is the same workflow you likely already use for other sensitive credentials.
      </P>
      <P>
        <strong>Sync between your own devices:</strong> We're working on an end-to-end encrypted device-linking flow
        that lets you sync your keys between devices you own — through a QR code scan, with the encryption happening
        entirely between your devices, never through our server. Until that ships, treat each device as its own setup.
      </P>
      <P>
        We chose not to offer server-side encrypted sync even though it would be cryptographically defensible. "Your
        keys are encrypted in our database" is a weaker story than "your keys never reach our storage." We prefer the
        stronger story — and the architectural constraint that enforces it.
      </P>

      <H2>Why this architecture</H2>
      <P>
        BYOK products that store your keys server-side — even in encrypted form — create attack surface. A database
        breach, a rogue employee, a misconfigured log, a subpoena, a legal compulsion. None of those can expose what
        doesn't exist in storage. By designing Vāda so keys are never written to any storage layer — only held in
        process memory for the duration of a single request — we take those risks off the table structurally.
      </P>
      <P>
        This also preserves your relationship with the model providers. Your Anthropic bill is yours. Your usage metrics
        at OpenAI are yours. Your rate limits are yours. Vāda is not a middleman; it's an orchestration layer on top of
        tools you already own.
      </P>

      <H2>Why this changed</H2>
      <P>
        Earlier versions of Vāda made API calls directly from your browser to model providers. We moved these calls
        server-side because the new architecture (Mastra workflow orchestration) requires server-side execution to
        produce accurate traces, coordinate multi-agent deliberations reliably, and give you a better experience.
      </P>
      <P>
        The privacy tradeoff: your key now transits our server memory during each deliberation. We protected this by
        ensuring the key is never written to any storage, never logged, and is dropped as soon as the request completes.
        This is a stronger posture than most BYOK products, just architecturally different from our earlier one.
      </P>

      <H2>How to verify our claims</H2>
      <UL>
        <li>
          <strong>Check the database schema.</strong> Drizzle schema files in the repository contain every table and
          column. Search for <code className='font-mono text-sm'>api_key</code>,{' '}
          <code className='font-mono text-sm'>credential</code>, <code className='font-mono text-sm'>token</code> — you
          won't find any.
        </li>
        <li>
          <strong>Check the identity package.</strong> The <code className='font-mono text-sm'>@atta/identity</code>{' '}
          package source is open for inspection. Look at where keys are stored (
          <code className='font-mono text-sm'>packages/identity/src/storage.ts</code>) and where they're read. Trace the
          call graph — the key is sent to exactly one destination: Vāda's{' '}
          <code className='font-mono text-sm'>/workflow/run</code> endpoint. No analytics, no telemetry, no error
          reporters, no third-party sinks.
        </li>
        <li>
          <strong>Check the workflow route.</strong>{' '}
          <code className='font-mono text-sm'>/api/deliberation/[id]/workflow/run</code> is the only route that accepts
          a key. Read the source — you'll see the key flowing to provider calls and never to storage.
        </li>
        <li>
          <strong>Check the network tab.</strong> You'll see the deliberation start as a POST to Vāda's{' '}
          <code className='font-mono text-sm'>/api/deliberation/[id]/workflow/run</code> (the POST body contains your
          key), then an SSE stream back. The server uses your key to make provider calls on your behalf — those calls
          happen server-side, not in your browser. You can verify what the server does with your key by inspecting the
          workflow endpoint source code, which is in the repository.
        </li>
        <li>
          <strong>Check the observability config.</strong> Our Langfuse integration includes a{' '}
          <code className='font-mono text-sm'>SensitiveDataFilter</code> that redacts{' '}
          <code className='font-mono text-sm'>apiKey</code> from all traces before they leave the process.
        </li>
      </UL>
      <P>If any of the above is untrue, that is a critical security bug and we want to know about it.</P>

      <hr className='my-12 border-border' />

      <P>
        <em>
          The BYOK promise is worth nothing if it's just a policy. We made the database constraint structural because
          policies can slip and schemas cannot. The server-transit model is honest: your key enters our process, does
          its job, and leaves. No storage. No logs. No copies.
        </em>
      </P>
    </article>
  )
}
