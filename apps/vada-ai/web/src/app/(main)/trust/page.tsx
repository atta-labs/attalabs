// /trust — BYOK architecture principles.
// Source of truth: apps/vada-ai/specs/v2/vada-byok-principles.md
// This copy is locked — do not paraphrase. If the doc changes, update here too.

import { Heading, Text } from '@atta/ui/shared'

export const metadata = {
  title: 'Trust · Vāda',
  description: 'How Vāda never sees your API keys — the BYOK architecture.'
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
        You bring your own API keys. Vāda never sees them, never stores them, never transmits them. This is not a policy
        we follow — it is a structural fact about how the product is built.
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
      <P>In both modes, the keys exist only on the device in front of you.</P>

      <H3>Vāda's servers never touch your keys</H3>
      <P>
        When a deliberation runs, API calls to model providers (Anthropic, OpenAI, Google, Mistral, DeepSeek, xAI, Meta,
        etc.) are made <strong>directly from your browser</strong>, not from Vāda's servers. Your browser authenticates
        to the provider using your key. Vāda's servers never see the key, never proxy the request, never intercept the
        response in transit.
      </P>
      <P>
        What Vāda's servers do see: the text of the responses your browser received, which gets stored as part of your
        deliberation history. The server orchestrates which agent runs next and constructs the prompts — but the actual
        API call, with your credentials, happens on your device.
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
        Server logs, error reports, analytics — none of these touch your API keys, because the keys never reach the
        server in the first place. The only logging that could ever involve your keys would be on your own device, in
        your browser's dev tools. That's your machine, your control.
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
        keys are encrypted in our database" is a weaker story than "your keys never reach our database." We prefer the
        stronger story — and the architectural constraint that enforces it.
      </P>

      <H2>Why this matters</H2>
      <P>
        BYOK products that still touch your keys server-side — even in encrypted form, even temporarily — create attack
        surface. A database breach, a rogue employee, a misconfigured log, a subpoena, a legal compulsion. None of those
        can expose what doesn't exist. By designing Vāda so the server never receives keys, we take those risks off the
        table structurally.
      </P>
      <P>
        This also preserves your relationship with the model providers. Your Anthropic bill is yours. Your usage metrics
        at OpenAI are yours. Your rate limits are yours. Vāda is not a middleman; it's an orchestration layer on top of
        tools you already own.
      </P>

      <H2>Audit trail</H2>
      <P>You can verify every claim on this page:</P>
      <UL>
        <li>
          <strong>Client code:</strong> the identity package source is open for inspection. Look for where keys are
          written (<code className='font-mono text-sm'>packages/identity/src/storage.ts</code>) and where they're read
          (hooks). Trace the call graph; you'll never find a <code className='font-mono text-sm'>fetch</code> to Vāda's
          server that includes key material.
        </li>
        <li>
          <strong>Server schema:</strong> the Drizzle schema defines every table and column. There is no key-like field
          anywhere in it. Grep the schema for <code className='font-mono text-sm'>api_key</code>,{' '}
          <code className='font-mono text-sm'>credential</code>, <code className='font-mono text-sm'>secret</code>,{' '}
          <code className='font-mono text-sm'>token</code> — you will find nothing.
        </li>
        <li>
          <strong>Server routes:</strong> no server route accepts an API key as input. Check the route handlers and
          input schemas; none of them will have a provider key field.
        </li>
        <li>
          <strong>Network tab:</strong> open your browser's developer tools during a deliberation. Watch the requests.
          You'll see calls going directly from your browser to{' '}
          <code className='font-mono text-sm'>api.anthropic.com</code>,{' '}
          <code className='font-mono text-sm'>api.openai.com</code>, etc. — not through Vāda's servers.
        </li>
      </UL>
      <P>
        If you find any of the above to be untrue, that is a critical security bug and we want to know about it
        immediately.
      </P>

      <hr className='my-12 border-border' />

      <P>
        <em>
          The BYOK promise is worth nothing if it's just a policy. We made it structural because policies can slip.
          Architecture cannot.
        </em>
      </P>
    </article>
  )
}
