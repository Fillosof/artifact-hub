---
description: "Scaffold a story implementation with tests for Artifact Hub"
---

# Implement Feature with Tests

## Goal

Implement a story from `docs/implementation-artifacts/` following Artifact Hub architecture, writing Vitest tests alongside the production code.

## Inputs

- **Story file**: path to the story `.md` in `docs/implementation-artifacts/` (e.g. `docs/implementation-artifacts/1-3-clerk-authentication-route-protection.md`)
- **Scope** *(optional)*: list of files expected to change — will be inferred from the story if omitted

## Steps

1. **READ** the story file in full. Extract: goal, acceptance criteria, and any technical notes or constraints.
2. **READ** relevant context files:
   - `lib/schema.ts` — DB table types and column names
   - `lib/auth.ts` — auth resolution pattern
   - `lib/types.ts` — shared TypeScript types
   - `docs/planning-artifacts/architecture.md` — architecture decisions and security invariants
3. **PLAN** — list every file to create or change, including corresponding test files. Be explicit before touching code.
4. **IMPLEMENT** — write the smallest working increment that satisfies all acceptance criteria:
   - Backend (`lib/`, `app/api/`): nanoid IDs, team-scoped queries, no raw Blob URLs in responses, structured error JSON.
   - Frontend (`app/`, `components/`): Server Component by default; `"use client"` only when browser APIs or interactivity are required.
   - MCP (`mcp-server/`): follow existing tool schema patterns from `mcp-server/tools.ts`.
5. **WRITE TESTS** — for every new `lib/` function or `app/api/` route:
   - Place in `lib/__tests__/<module>.test.ts` or co-located `__tests__/`.
   - At minimum: happy path + one error path (auth failure, not-found, validation error).
   - Mock `@/lib/db` and `@/lib/auth` at module level — no real DB or network calls.
6. **RUN GATES** — paste the results back:
   ```bash
   npm run typecheck && npm run lint && npm run test && npm run build
   ```
   For MCP stories, also run: `cd mcp-server && npm run build`
7. **REPORT** — list all files changed and confirm every gate passed.

## Checks (must all be true before done)

- [ ] Every acceptance criterion in the story file is met
- [ ] Every new backend function or API route has a Vitest test
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run test` — all tests green
- [ ] `npm run build` — success
- [ ] No `any` types introduced
- [ ] No raw Blob URLs (`fileUrl`) in API responses or JSX

## Example Call

> "Implement story `docs/implementation-artifacts/1-3-clerk-authentication-route-protection.md`"

Expected output: updated `middleware.ts`, updated `lib/auth.ts`, new `lib/__tests__/auth.test.ts`, gate output showing all green.
