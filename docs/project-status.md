# Artifact Hub — Project Status

_Generated: April 15, 2026_

---

## Current State

**All 9 epics are complete. The MVP is feature-complete and deployed to production.**

### Health Gates

| Gate | Status |
|---|---|
| TypeScript (`npm run typecheck`) | ✅ Zero errors |
| ESLint (`npm run lint`) | ✅ 0 errors (14 minor warnings) |
| Vitest (`npm run test`) | ✅ 178 tests passing across 19 test files |
| MCP build (`npm run build:mcp`) | ✅ Compiles clean |

### What's Live

**Authentication & Teams**
- Clerk-based sign-up / sign-in with session tokens
- Multi-team membership — one user can belong to multiple teams with independent roles (member / admin)
- Team creation, invite by link, member role management, team deletion
- Pending invitation UI

**Artifact Publishing**
- Drag-and-drop upload with a minimal publish dialog (title + file; source URL optional)
- Files stored in Vercel Blob; raw blob URLs never exposed — all access goes through an authenticated proxy (`/api/files/[artifactId]`)
- 10 MB upload limit enforced server-side
- Artifacts available immediately after publish; AI enrichment runs asynchronously

**AI Enrichment Pipeline**
- Claude auto-generates tags (≤8, normalized) and a summary on every upload
- Async fire-and-forget — never blocks the publish response
- Failure-safe: enrichment errors set `enrichmentStatus: 'failed'`; artifact remains fully accessible
- Owners and admins can edit tags/summary manually or trigger AI re-generation

**Gallery & Discovery**
- Gallery with fixed sidebar: team switcher, tag/type filters, keyword search
- `ArtifactRow` with file-type icon, AI summary snippet, tag chips, relative date, publisher
- SQL `LIKE` search across title, summary, and tags — always team-scoped (max 50 results)

**Artifact Detail & Preview**
- Inline image preview (native `<img>`)
- PDF embed (browser-native `<embed>`)
- HTML sandboxed iframe (`sandbox` attribute, scripts disabled)
- Download fallback for unsupported types
- Stable auth-gated URLs — no expiring links
- Access-denied screen for users without team membership

**Comments**
- Structured threaded comments with author attribution and timestamps
- Sticky comment input; scrollable history
- Comments are permanent (no delete in MVP)

**MCP Server**
- Three tools: `publish_artifact`, `search_artifacts`, `get_artifact`
- stdio transport — Claude Desktop compatible
- API key auth (SHA-256 hashed; plain-text shown once, never stored)
- All operations scoped to authenticated user's teams

**Admin Governance**
- Admins can delete any artifact in their team (permanent, with confirmation dialog)
- Members cannot delete artifacts

### Known Minor Issues (Non-Blocking)

1. **MIME type allowlist missing** — size and presence are validated server-side, but any MIME type is accepted. Documented in `docs/implementation-artifacts/deferred-work.md`.
2. **File proxy cache header** — `Cache-Control: private, max-age=3600`; stale responses possible if a blob URL is ever replaced (no replacement feature exists yet).
3. **Two oversized route handlers** — `app/api/teams/[teamId]/members/route.ts` (434 lines) and `components/team-members.tsx` (412 lines) slightly exceed the 200-line guideline; both handle multi-operation surfaces and are otherwise clean.

---

## Next Steps

Items explicitly deferred from the MVP, ordered by impact:

### Immediate (Next Sprint)

1. **MIME type allowlist** — Enforce an explicit server-side allowlist (`image/*`, `application/pdf`, `text/html`) and reject unsupported types with `VALIDATION_ERROR`. Security gap from Story 3.1.
2. **MCP comment tool** — 4th MCP tool: `add_comment(artifactId, content)` so Claude Desktop users can annotate artifacts without switching to the web UI.
3. **HTML artifact preview** — Sandboxed `<iframe>` rendering (architecture already supports it; `DocumentPreviewer` has the variant placeholder).

### Short-Term

4. **Configurable / expiring share links** — Currently all URLs are stable and auth-gated only. Add optional time-limited tokens for external sharing without requiring a Clerk account.
5. **Bulk upload** — Accept multiple files in a single publish session; useful for design asset batches.
6. **Notifications** — In-app or email alerts when someone comments on your artifact or invites you to a team.

### Medium-Term

7. **Version history** — Track artifact revisions so owners can roll back to a previous upload or see what changed and when.
8. **Approval workflows** — Optional lightweight review gate (request → approve / reject) for teams that need sign-off before an artifact is visible to all members.
9. **Analytics dashboard** — Publish frequency, gallery views, cross-team discovery stats, and comment engagement per team.
10. **Natural language (semantic) search** — Replace SQL `LIKE` with vector embeddings for intent-aware search across artifact content, not just metadata.
11. **AI feedback summarization** — Claude summarizes comment threads on demand, giving reviewers a TL;DR without reading every reply.

### Integrations

12. **Slack bot** — Post a message to a Slack channel when a new artifact is published; allow `/artifacthub search <query>` from Slack.
13. **Gamma integration** — Direct publish from Gamma presentations to the hub without manual export.
14. **Browser extension** — One-click publish of any page or selected content directly to Artifact Hub.

---

## Vision

Artifact Hub is positioned to become the **system of record for AI-assisted work** across an organization — not just a file store, but the place where AI outputs are published, discovered, reviewed, and built upon.

### The Core Differentiator

**MCP-native publishing.** Every artifact platform has an upload form. Artifact Hub is designed so the AI tool itself is a first-class publishing citizen. When a user says "publish this to the hub" in Claude, it happens — no export, no tab-switching, no manual tagging. This is a category-defining architectural choice that no DAM tool, wiki, or developer portal currently offers.

### 2–3 Year Trajectory

**Integration hub.** Every AI tool — MCP clients, Gamma, Slack, browser extensions — publishes here automatically. The act of publishing becomes invisible; the artifact simply appears in the catalog as a byproduct of the creative process.

**Intelligence layer.** AI-powered semantic search, auto-tagging, feedback summarization, and smart routing make the catalog smarter as it grows. The system learns team vocabulary and surfaces related artifacts before users ask.

**Organizational memory.** A searchable, browsable, permanent record of a company's AI-assisted work. Reduces duplicate effort ("did we already generate a competitive analysis?"), surfaces best practices, and gives leadership visibility into AI adoption and output quality.

**Governance foundation.** As AI content compliance requirements emerge (provenance tracking, usage auditing, access control), Artifact Hub's data model is already structured to support them — every artifact has a creator, team, timestamp, and enrichment audit trail.

### Success Looks Like

- Teams actively publish AI outputs here instead of dropping files into Slack
- Cross-team discovery: artifacts are viewed and commented on by members outside the publishing team
- The MCP server is the default publish target configured in every Claude Desktop instance in the organization
- Artifact Hub becomes the answer to "where did we put that AI analysis from last quarter?"
