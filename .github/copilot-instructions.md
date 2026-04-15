# Artifact Hub — Workspace Instructions

## Project Overview

**Artifact Hub** is a challenge project (2-day timebox) building an internal platform where AI tools publish, browse, review, and share AI-generated content. See the full brief in [docs/artifact-hub-challenge.md](../docs/artifact-hub-challenge.md) and the product brief at [docs/planning-artifacts/product-brief-artifact-hub.md](../docs/planning-artifacts/product-brief-artifact-hub.md).

**User**: Yurii — intermediate skill level.

## Tech Stack (MVP)

- **Framework**: Next.js App Router (TypeScript)
- **Auth**: Clerk
- **Storage**: Vercel Blob
- **Database**: Turso + Drizzle ORM
- **Deployment**: Vercel
- **AI**: Claude API (auto-tagging, summarization on upload)
- **MCP Server**: 3 tools — publish, search, read artifacts

## BMAD Workflow

This workspace uses the [BMAD method](https://github.com/bmad-code-org) (v6.3.0) with three modules:
- **core** — shared config (`_bmad/core/config.yaml`)
- **bmm** (BMAD Method Module) — planning → implementation lifecycle (`_bmad/bmm/config.yaml`)
- **cis** (Creative Intelligence Suite) — brainstorming, storytelling, design thinking

### Document Paths

| Artifact type | Location |
|---|---|
| Planning (PRD, brief, epics, stories) | `docs/planning-artifacts/` |
| Implementation (code specs, arch decisions) | `docs/implementation-artifacts/` |
| General project knowledge | `docs/` |

### Skills Available

**BLOCKING REQUIREMENT**: When a skill applies to the user's request, use `read_file` to load and read the full `SKILL.md` IMMEDIATELY as your FIRST action, BEFORE generating any response or taking any action. Never reference or mention a skill without reading it first.

50+ BMAD skills are installed in `.github/skills/`. Key ones for this project:

| Task | Skill |
|---|---|
| Create/edit PRD | `bmad-create-prd`, `bmad-edit-prd` |
| Create architecture | `bmad-create-architecture` |
| Break into epics/stories | `bmad-create-epics-and-stories`, `bmad-create-story` |
| Implement a story | `bmad-dev-story`, `bmad-quick-dev` |
| Sprint planning/status | `bmad-sprint-planning`, `bmad-sprint-status` |
| Code review | `bmad-code-review` |
| Check readiness | `bmad-check-implementation-readiness` |

## Architecture Decisions (In-Scope MVP)

- Progressive rendering: images → PDFs → HTML → fallback
- Roles: member / admin (multi-team)
- Sharing: stable auth-gated URLs (no expiring links in MVP)
- Feedback: structured comments (not Slack-style threads)

## Out of Scope (MVP)

Expiring links, Slack bot, Gamma integration, version history, approval workflows, analytics, notifications, NL search, feedback summarization. See product brief for full deferred list.

## Conventions

- All code in **TypeScript** — no `any` unless unavoidable
- Output documents in **English**
- Running system at a **public URL** is a hard deliverable requirement
- `WRITEUP.md` at project root is required at submission

---

## Coding Instructions

### Quick Start — Top Rules

1. **TypeScript strict** — no `any`; use Drizzle's `$inferSelect` / `$inferInsert` for DB types, not hand-rolled interfaces.
2. **Test every backend change** — every new `lib/` function or `app/api/` route handler needs a Vitest test in `lib/__tests__/` or a co-located `__tests__/` folder.
3. **Never expose raw Blob URLs** — all file access must go through the authenticated proxy route. Never pass `artifacts.fileUrl` from the DB directly into any API response or JSX element.
4. **Always team-scope DB queries** — every data query must filter by the caller's `teamId`. Leaking cross-team data is a security bug.
5. **Run gates before marking a story done**: `npm run typecheck && npm run lint && npm run test && npm run build`.

### Context Sources

| What you need | Where to look |
|---|---|
| DB schema (tables, columns, types) | `lib/schema.ts` |
| DB singleton client | `lib/db.ts` |
| Auth resolution (Clerk + API keys) | `lib/auth.ts` |
| AI enrichment pipeline | `lib/enrichment.ts` |
| Shared TypeScript types | `lib/types.ts` |
| Utility helpers | `lib/utils.ts` |
| MCP tool definitions | `mcp-server/tools.ts` |
| App Router entry points | `app/layout.tsx`, `app/page.tsx` |
| Route protection | `middleware.ts` |
| Architecture decisions | `docs/planning-artifacts/architecture.md` |
| Epics and stories list | `docs/planning-artifacts/epics.md` |
| Sprint status | `docs/implementation-artifacts/sprint-status.yaml` |

### Do / Don't

**Do:**
- Use `nanoid()` for all primary keys — IDs are `text`, not `integer` (see `lib/schema.ts`).
- Store timestamps as `integer('created_at', { mode: 'timestamp_ms' })` (Unix ms → `Date`).
- Hash API keys with `crypto.createHash('sha256')` — store only the hex hash in `api_keys.key_hash`, never the raw key.
- Use Drizzle's type-safe query builder for all DB access — no raw SQL strings.
- Normalize tag values (lowercase + trim) before writing to `artifact_tags`. Enforce max 8 tags per artifact.
- Use `$inferSelect` / `$inferInsert` from `lib/schema.ts` to type DB rows.
- Default to Server Components; add `"use client"` only when browser APIs or interactivity are required.
- Respect the `enrichmentStatus` lifecycle: insert as `'pending'`, enrich async, update to `'complete'` or `'failed'`.

**Don't:**
- Don't return `fileUrl` from any API response — it's the internal Blob URL. Return a proxy URL instead.
- Don't hardcode secrets, tokens, or connection strings — use `.env.local` variables.
- Don't write cross-team DB queries — always filter by the authenticated user's `teamId`(s).
- Don't use `any` — if you're stuck on a type, use `unknown` and narrow it.
- Don't add external npm dependencies without noting licensing and security implications.
- Don't bypass the enrichment lifecycle — on Claude API error, set `enrichmentStatus: 'failed'`, do not delete the artifact.
- Don't use `dangerouslySetInnerHTML` for HTML artifacts — use a sandboxed `<iframe>`.

### Coding Conventions

- **Language**: TypeScript 5 strict (`"strict": true` in `tsconfig.json`).
- **Linting**: ESLint v9 with `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`. Run `npm run lint`.
- **No Prettier** is configured — don't introduce it without discussion.
- **Imports**: use `@/` alias for workspace root (configured in both `tsconfig.json` and `vitest.config.ts`).
- **Components**: shadcn/ui components live in `components/ui/` — don't modify them directly; wrap or compose.
- **Styles**: Tailwind CSS v4 utility classes only. No inline `style={}` props.
- **File size**: components and route handlers should stay under ~200 lines.

### Testing Rules

- **Framework**: Vitest v4 only (configured in `vitest.config.ts`).
- **Environment**: `node` (not jsdom) — no DOM assertions unless jsdom is explicitly enabled.
- **Test locations**: `lib/__tests__/*.test.ts` or co-located `__tests__/` folders.
- **What to test per change**:
  - New `lib/` utility → unit test covering happy path + at least one edge case.
  - New `app/api/` route → integration test with mocked DB + auth.
  - New schema table or column → `assertType` test in `lib/__tests__/schema.test.ts`.
  - Bug fix → regression test that would have caught the bug.
- **What not to test**: Next.js framework internals, Clerk internals, Drizzle internals.

### Review Gates

Run these in order before marking any story done:

```bash
npm run typecheck   # tsc --noEmit — catches TS errors before build
npm run lint        # ESLint v9
npm run test        # Vitest run
npm run build       # next build — catches runtime-breaking issues
```

For MCP stories (7.x):

```bash
cd mcp-server && npm run build
```

### Agent Guidance

Path-specific instructions are auto-applied by Copilot based on file globs:

- **Backend** (`lib/**`, `app/api/**`, `mcp-server/**`): [backend.instructions.md](.github/instructions/backend.instructions.md)
- **Tests** (`**/__tests__/**`, `**/*.test.ts`): [tests.instructions.md](.github/instructions/tests.instructions.md)
- **Frontend** (`app/**/*.tsx`, `components/**/*.tsx`): [frontend.instructions.md](.github/instructions/frontend.instructions.md)

Prompt library — invoke with `@workspace` + the prompt name in Copilot Chat:

| Prompt | Use when |
|---|---|
| `implement_feature_with_tests` | Starting a new story |
| `add_tests_to_existing_module` | Adding coverage to a `lib/` module |
| `refactor_safely` | Structural changes without behaviour change |
| `prepare_pr_description` | Ready to submit a story |
| `review_this_diff` | Reviewing code changes |
| `critique_rubric` | Scoring a story against its ACs |
