<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data.

## Step 1 — Read the local reference first (zero MCP calls needed for common patterns)

**ALWAYS** read `docs/tech-reference/stack-patterns.md` before writing any code.
It contains pre-fetched, distilled patterns for Next.js 16 App Router, Clerk, Drizzle + Turso, and Vitest.

## Step 2 — Only call Context7 MCP when a topic is NOT in the local reference

Call `mcp_io_github_ups_get-library-docs` with the ID directly. Never call `resolve-library-id` for these libraries.

| Library | Context7 ID |
|---|---|
| Next.js 16 | `/vercel/next.js` |
| Clerk (auth) | `/clerk/clerk-docs` |
| Drizzle ORM | `/drizzle-team/drizzle-orm-docs` |
| Vitest | `/vitest-dev/vitest` |

After fetching any new topic via MCP, **append it to `docs/tech-reference/stack-patterns.md`** so future runs don't need to call MCP again.

For any library **not** in this table, call `resolve-library-id` once, then add it to this table.
<!-- END:nextjs-agent-rules -->

---

# Artifact Hub — Agent Specification

## Purpose

This agent spec governs AI coding assistance for **Artifact Hub** — a Next.js 16 App Router platform where AI tools publish, browse, and share AI-generated content. See `.github/copilot-instructions.md` for the full workspace context.

The agent's primary responsibilities:

1. Implement stories from `docs/implementation-artifacts/` following BMAD conventions.
2. Write or update Vitest tests for every backend or data change.
3. Keep TypeScript strict, ESLint clean, and the build green.
4. Respect security invariants: authenticated file proxy, hashed API keys, team-scoped queries.

## Capabilities

- **Story implementation**: Read a story file, implement acceptance criteria, write tests, run review gates, report results.
- **Schema changes**: Add Drizzle columns/tables with correct types (nanoid PKs, `timestamp_ms`), run `npx drizzle-kit push`, add `assertType` tests in `lib/__tests__/schema.test.ts`.
- **API route scaffolding**: Create `app/api/` route handlers — auth check first, team-scoped query, structured error JSON, no raw Blob URLs in responses.
- **Frontend scaffolding**: Server Components by default (`app/**`); Client Components (`"use client"`) only for interactivity. shadcn/ui + Tailwind v4.
- **MCP tool implementation**: Implement `publish_artifact`, `search_artifacts`, `get_artifact` in `mcp-server/` using the MCP TypeScript SDK.
- **AI enrichment pipeline**: Implement Claude API calls in `lib/enrichment.ts` following the async lifecycle (pending → complete | failed).
- **Code review**: Run the review gates, report failing checks with the smallest concrete fix.

## Guardrails — Never Do

- **Never** return `fileUrl` (raw Vercel Blob URL) in any API response or use it in `<img src>` / `<iframe src>`. Always proxy through an authenticated route.
- **Never** store a raw API key. Always hash with SHA-256 (`crypto.createHash('sha256')`); store only the hex digest.
- **Never** write a DB query without filtering by the authenticated user's `teamId`(s). Cross-team data leakage is a security bug.
- **Never** hardcode secrets, tokens, or connection strings. All secrets come from `.env.local`.
- **Never** log or print PII (user IDs, file content, email addresses) outside of local-only debug statements.
- **Never** add `any` to TypeScript. Use `unknown` + type narrowing instead.
- **Never** skip review gates (`typecheck → lint → test → build`) before marking a story done.
- **Never** store more than 8 tags per artifact — enforce on write (FR33).
- **Never** bypass or disable ESLint rules to silence errors — fix the root cause.
- **Never** create branches, commits, or PRs. Work on local file edits only.

## Typical Workflow

```
1. READ   → Load the story file from docs/implementation-artifacts/
2. READ   → Load context: lib/schema.ts, lib/types.ts, architecture.md
3. PLAN   → List every file to create/change + corresponding test files
4. APPLY  → Implement the smallest working increment satisfying all ACs
5. TEST   → Write/update Vitest tests (mock DB + auth; no real calls)
6. GATE   → npm run typecheck && npm run lint && npm run test && npm run build
7. REPORT → Confirm gates pass; list all files changed with a one-line note per file
```

For MCP stories (7.x), add `cd mcp-server && npm run build` to step 6.

## Example Sessions

### Implementing a story

> "Implement story 1-3 (Clerk auth + route protection)"

1. Read `docs/implementation-artifacts/1-3-clerk-authentication-route-protection.md`
2. Read `middleware.ts`, `lib/auth.ts`, `app/layout.tsx`, `docs/planning-artifacts/architecture.md`
3. Plan: update `middleware.ts` (Clerk `clerkMiddleware`), update `lib/auth.ts` (`resolveAuth` implementation), wrap `app/layout.tsx` with `ClerkProvider`, write `lib/__tests__/auth.test.ts`
4. Implement changes
5. Run: `npm run typecheck && npm run lint && npm run test && npm run build`
6. Report files changed and gate results

### Adding a schema table

> "Add a notifications table"

1. Read `lib/schema.ts` — note existing conventions (nanoid PKs, `timestamp_ms`, `index()` helpers)
2. Add the table following the same patterns
3. Run `npx drizzle-kit push` to apply to Turso
4. Add `assertType` tests in `lib/__tests__/schema.test.ts`
5. Run gates

### Reviewing a diff

> "Review this diff for the artifact upload route: [paste diff]"

1. Check every item in the `.github/prompts/review_this_diff.prompt.md` checklist
2. Report pass/fail per category (Security, TypeScript, Architecture, Tests, Conventions)
3. For each failure: exact line + smallest fix

## Test & Lint Priority

- Every story that changes `lib/` or `app/api/` **must** include a Vitest test.
- Zero TypeScript errors — errors block story completion.
- Zero ESLint errors — errors block story completion; fix root cause, never disable rules.
- Build failures block story completion.
- Tests that are deleted or weakened to make the suite green are a red flag — fix the failing code instead.
