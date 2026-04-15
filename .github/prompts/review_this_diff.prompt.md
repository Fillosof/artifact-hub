---
description: "Review a code diff against Artifact Hub standards"
---

# Review This Diff

## Goal

Review provided code changes against Artifact Hub's security invariants, TypeScript conventions, architecture patterns, and testing requirements. Produce a structured pass/fail/warn report with actionable fixes.

## Inputs

- **Diff or file contents**: paste the unified diff, or describe the changes with file names

## Steps

1. **READ** the diff carefully — understand the full intent before evaluating individual lines.
2. **CHECK** each category below. For each item report: ✅ Pass / ❌ Fail / ⚠️ Warn / N/A.

### Security

- [ ] No raw Blob URL (`artifacts.fileUrl`) returned in any API response or used in `<img src>` / `<iframe src>`
- [ ] No hardcoded secrets, tokens, or connection strings
- [ ] API key handling: only SHA-256 hash stored — raw key never persisted
- [ ] All DB queries are team-scoped (no cross-team data leakage)
- [ ] HTML artifacts rendered inside `<iframe sandbox="...">` — never `dangerouslySetInnerHTML`
- [ ] Auth check occurs before any DB access in every handler

### TypeScript

- [ ] No `any` types introduced
- [ ] DB row types use `$inferSelect` / `$inferInsert` from `lib/schema.ts`, not hand-rolled interfaces
- [ ] All new exported functions have explicit return types

### Architecture

- [ ] IDs use `nanoid()` and are typed as `text` (not auto-increment `integer`)
- [ ] Timestamps use `integer('...', { mode: 'timestamp_ms' })`
- [ ] Enrichment lifecycle respected: artifact inserted as `'pending'` → async enrich → `'complete'` | `'failed'`
- [ ] Server Components used for data fetching; `"use client"` only for interactivity
- [ ] `<Link>` used for internal navigation, not `<a href>`
- [ ] Error responses are structured `{ error: string }` JSON with correct HTTP status codes

### Tests

- [ ] New `lib/` functions have Vitest unit tests
- [ ] New `app/api/` route handlers have integration tests with mocked DB + auth
- [ ] New or changed schema columns have `assertType` tests in `lib/__tests__/schema.test.ts`
- [ ] No `any` in test code — typed mocks via `vi.mocked()`
- [ ] No real DB or network calls in tests (all external deps mocked)

### Conventions

- [ ] No raw SQL — Drizzle query builder used exclusively
- [ ] Tag values normalized (lowercase + trim) before writing to `artifact_tags`
- [ ] Tags capped at 8 per artifact on write
- [ ] Components and route handlers are under ~200 lines

3. **REPORT** — for every ❌ Fail or ⚠️ Warn, provide:
   - The exact pattern or line that triggered it.
   - A concrete suggested fix (code snippet preferred).

4. **VERDICT**: ✅ Approved / ⚠️ Approved with changes / ❌ Changes required.

## Checks

- [ ] Every security invariant has been checked
- [ ] Every TypeScript convention has been checked
- [ ] Every failing item has a suggested fix
- [ ] No "pass" given for an item that was not verifiable from the diff

## Example Call

> "Review this diff for the artifact upload route: [paste diff of `app/api/artifacts/route.ts`]"

Expected output: table of checks with pass/fail, list of issues with suggested fixes, overall verdict.
