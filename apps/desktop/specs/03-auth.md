# 03 — Authentication (Clerk on the desktop)

Auth is the single largest *new* piece of the desktop product. The good news: it is a **paved path** — Clerk explicitly supports native/desktop contexts and lists a Tauri integration. The work is bounded and well-documented.

## The mental correction that frames everything

"The desktop runs a local Next server, so it's all web — why is Clerk a problem?" — Correct about **rendering**: `NextWebShell`, SSR, `next/headers cookies()`, `ClerkProvider` all run fine on a local Next server. The real issue is **not rendering**, it is that **"web" is origin-scoped**: a Clerk session lives on a specific origin, and the desktop is a *different* origin than `.attalabs.dev`.

## The two hard constraints (both verified in Clerk docs)

1. **Production keys are domain-locked.** `pk_live`/`sk_live` only work with the configured production domain — **localhost won't work with production keys** ("Production Keys are only allowed for domain your-domain.com"). So pointing the desktop's webview at `http://localhost:<port>` against the prod instance fails origin validation out of the box.
2. **🔴 Non-standard ports break origin validation.** Clerk's docs: when a browser sends a request from a non-standard port (e.g. `:3000`), the **port is included in the Origin header**, and **Clerk's origin validation fails when the port is included.** This is a Model-B-specific landmine (the sidecar serves on `localhost:<port>`), and it undermines the naive "map a subdomain to localhost" workaround.

## The resolution — Clerk **native-application mode**

Do not fight the cookie/origin model. Use Clerk's **native mode**: the session is a **token stored client-side and sent in the `Authorization: Bearer` header**, not an origin cookie. This is the model Clerk uses for React Native / Expo / iOS / Android, and it **sidesteps the port-origin problem entirely** (it isn't doing browser-cookie/origin auth).

Clerk's SDK docs name this exact use case: *for browser-like stacks such as browser extensions, **Electron**, or Capacitor.js, the instance `allowed_origins` need to include the request origin; for Electron the default origin is `http://localhost:3000`.* So:

- **Register the desktop's origin in the production instance's `allowed_origins`** (via API PATCH or the Dashboard) and **enable the Native API** on the "Native applications" page.
- Client integration follows the **`tauri-plugin-clerk`** pattern (community-maintained, listed in Clerk's official docs): it patches global `fetch` to route Clerk API calls through Tauri's native Rust HTTP, so the JS package works as-is and the `Origin`+`Authorization` header conflict is avoided (Clerk's API rejects requests carrying **both** — `origin_authorization_headers_conflict`). Production sign-in config from Clerk's issue tracker: `allowed_origins: ["tauri://localhost"]` (or the localhost origin) + `<ClerkProvider allowedRedirectProtocols={["tauri:"]} />`.

## What you do NOT need

- **No separate Clerk app.** The desktop is just another registered origin on the **existing** production instance → a user's Atta identity stays consistent across web and desktop. (Atta-family instance: `summary-ladybird-76`. **Herald** has its own Clerk app (`closing-blowfish-4`) per the standalone decision, so a Herald surface in the desktop registers against Herald's instance.)
- **No satellite domain.** Satellite domains are for multi-domain *web* SSO (CNAME records); a native client doesn't need that.
- **A domain is still required** on the production instance — but `attalabs.dev` already exists on it, so this is satisfied. The desktop is an *additional origin*, not a new domain.

## Server-side auth still works in Model B

Because the sidecar is a real Next server, `clerkMiddleware` and server `auth()` run and can verify the native token. **`authorizedParties` must include the desktop origin** (`clerkMiddleware({ authorizedParties: [...] })`) or server-side auth rejects the native client (Clerk's recommended protection against subdomain cookie-leaking).

## Honest UX consequence

Web and desktop are **independent sessions** (different origins). Signing in on the web does **not** silently sign you into the desktop. The user logs into the desktop once, via its own native sign-in. Normal for native apps; state it plainly, don't imply seamless SSO.

## Social / OAuth note

Email-code / password sign-in works in-webview. **Social OAuth (Google, etc.) is blocked by providers inside embedded webviews** (`disallowed_useragent`); handled via the `tauri:` custom-protocol redirect (or a system-browser handoff). Whether this matters depends on whether the desktop offers social login — a product decision. `@atta/auth/provider.tsx` is a thin `ClerkProvider` wrapper today; the desktop's `DesktopShell` provides the native-mode provider variant.

## Spike shortcut

With a **development** Clerk instance (`pk_test`) all of this works **trivially** (dev instances allow HTTP/localhost and shared OAuth). So the spike validates the whole desktop+Clerk flow on a dev instance immediately; the `allowed_origins` + Native API config is only the *production* hardening step.
