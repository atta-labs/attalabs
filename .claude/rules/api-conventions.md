# API Conventions

## Route Handlers

- All API routes live under `src/app/api/`
- Use Next.js App Router route handlers (`route.ts`)
- Return proper HTTP status codes and JSON responses
- Always handle errors gracefully — never return raw stack traces
