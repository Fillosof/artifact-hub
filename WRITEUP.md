# Artifact Hub — Challenge Write-Up

## What I Built

**Artifact Hub** is an internal platform that bridges AI tools with human teams. AI agents (Claude Desktop via MCP) publish generated content — documents, images, code — to a shared catalog. Team members then browse, preview, filter, comment on, and share those artifacts through a web interface.

The platform was built across 9 epics and roughly 26 stories within a 2-day challenge timebox:

| Epic | Scope |
|---|---|
| 1 | Project initialization, schema, Clerk auth, core API |
| 2 | Artifact upload, Vercel Blob storage, AI enrichment pipeline |
| 3 | Gallery browse — list, search, filter, detail page |
| 4 | API key management (issue, revoke, SHA-256 hash storage) |
| 5 | MCP server — `publish_artifact`, `search_artifacts`, `get_artifact` |
| 6 | Structured comments on artifacts |
| 7 | Team management — create, switch, invite members |
| 8 | Admin-only artifact deletion |
| 9 | UX polish, responsive layout, accessibility, deployment |

### Core user flows

1. **Publish via Claude Desktop** — Claude calls the MCP `publish_artifact` tool; the artifact lands in the gallery with auto-generated tags and a summary.
2. **Browse and preview** — members open the gallery, filter by type or tag, search by keyword, and view inline previews (image, PDF, HTML sandbox iframe, or fallback).
3. **Comment** — threaded structured comments attached to each artifact; team-scoped so cross-team data never leaks.
4. **Share** — stable auth-gated URLs are copyable from the detail page; anyone with a Clerk account on the same team can open them.

---

## Technical Decisions

### Next.js 15 App Router

App Router's React Server Components deliver zero-JS server-side renders for the gallery and artifact pages, reducing client bundle size and improving initial load. Route handlers replace a separate Express API, keeping the codebase in one repo and simplifying deployment on Vercel.

### Clerk for authentication

Clerk is zero-setup SSO — configuring `<ClerkProvider>` and a few middleware lines gives us a fully functional auth layer (sign-in, sign-up, session tokens, publishable/secret key pair) without managing sessions or JWTs manually.

### Turso + Drizzle ORM

Turso is a distributed edge SQLite service with low-latency reads from Vercel edge regions. Drizzle's type-safe query builder means all DB access is checked at build time using TypeScript inference (`$inferSelect` / `$inferInsert` from `lib/schema.ts`), eliminating a whole class of runtime type errors. No raw SQL strings anywhere; no hand-rolled interfaces.

### Vercel Blob for file storage

Blob gives direct-to-edge file storage with a single `put()` call. All file access is proxied through an authenticated `/api/files/[id]` route — raw Blob URLs are never surfaced in API responses or rendered directly in JSX, satisfying the security invariant from the brief.

### Async AI enrichment (fire-and-forget)

Publishing an artifact is fast: the file is stored, a DB row is inserted with `enrichmentStatus: 'pending'`, and an enrichment request is fired asynchronously to `/api/enrich`. Claude then generates a summary and up to 8 tags in the background. If Claude fails, `enrichmentStatus` flips to `'failed'` and the artifact is still accessible — the pipeline never blocks a publish or deletes uploaded content.

### MCP server with stdio transport

The MCP server uses the `@modelcontextprotocol/sdk` with `StdioServerTransport`, which is the mechanism Claude Desktop uses to talk to local tools. Tools exposed:

| Tool | Description |
|---|---|
| `publish_artifact` | Multipart text upload via API key |
| `publish_artifact_from_file` | Publishes a local file with SHA-256 integrity verification |
| `search_artifacts` | Keyword + type + tag filter across one or all teams |
| `get_artifact` | Full metadata + comments; **saves the artifact file locally** to `./downloads/` (or `ARTIFACT_HUB_DOWNLOAD_DIR` env var) via the authenticated `/api/files/` proxy |
| `start_artifact_draft` | Opens a chunked draft for large content |
| `append_artifact_chunk` | Appends a chunk to an open draft |
| `finalize_artifact` | Verifies integrity and publishes a completed draft |
| `list_teams` | Lists all teams the caller is a member of |

`get_artifact` downloads the binary (or text) file through the authenticated server-side proxy and writes it to disk — the raw Vercel Blob URL is never exposed. API keys are stored only as SHA-256 hex hashes in the database — plain-text keys are shown once at creation time and never again.

### shadcn/ui + Tailwind CSS v4

shadcn/ui gives accessible, composable primitives (Dialog, Skeleton, Button) without bloated dependencies. Tailwind v4 utility classes keep styles co-located with markup and tree-shake unused styles automatically. No custom CSS files needed beyond the global reset.

### nanoid for primary keys

All primary keys are `text` columns populated with `nanoid()` — short, URL-safe, random, and collision-resistant without a UUID index overhead. IDs appear in URLs and API responses without leaking row counts.

### SHA-256 for API keys

API keys are generated as `nanoid(32)`, shown once to the user, then stored only as `hex(sha256(key))`. Authentication hashes the incoming `Authorization: Bearer <key>` header value and compares to the stored hash — timing-safe comparison prevents timing attacks.

---

## How to Run Locally

### Prerequisites

- Node.js 20+
- A Turso account and database
- A Clerk application (free tier)
- A Vercel project with a Blob store
- An Anthropic API key

### Steps

```bash
# 1. Clone the repo
git clone <repo-url>
cd Yurii_Krot@epam.com-Artifact-Hub

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and fill in all 8 values (see .env.example for guidance)

# 4. Push the DB schema to Turso
npx drizzle-kit push

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, create a team, and start uploading artifacts.

### Build the MCP server

```bash
npm run build:mcp
# Compiles mcp-server/index.ts → mcp-server/dist/index.js
```

---

## Configuring Claude Desktop for MCP

Add the following block to your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "artifact-hub": {
      "command": "node",
      "args": ["/absolute/path/to/repo-root/mcp-server/dist/index.js"],
      "env": {
        "ARTIFACT_HUB_API_URL": "https://artifact-hub-theta.vercel.app",
        "ARTIFACT_HUB_API_KEY": "your-api-key-from-settings-page",
        "ARTIFACT_HUB_DOWNLOAD_DIR": "/absolute/path/to/downloads"
      }
    }
  }
}
```

Steps:
1. Run `npm run build:mcp` to compile the server.
2. In the Artifact Hub UI, go to Settings → API Keys → Generate Key. Copy the key (shown only once).
3. Replace `/absolute/path/to/repo-root` with the real absolute path on your machine.
4. Replace `ARTIFACT_HUB_API_URL` with your Vercel URL (or `http://localhost:3000` for local testing).
5. Optionally set `ARTIFACT_HUB_DOWNLOAD_DIR` to control where `get_artifact` saves files locally (defaults to `mcp-server/downloads/`).
6. Restart Claude Desktop — the `artifact-hub` tools appear in the tool list.

---

## Out-of-Scope Items Deferred

The following features were explicitly deferred per the challenge brief to hit the 2-day timebox:

| Feature | Reason deferred |
|---|---|
| Expiring share links | Requires a cron job or edge middleware for TTL enforcement; not critical for MVP evaluate flow |
| Slack bot integration | Separate service dependency; no Slack workspace provided for testing |
| Gamma integration | Third-party read API; no Gamma API key in the challenge brief |
| Version history & diffs | Complex UI; adds significant DB surface area |
| Approval workflows | Requires state machine; out of MVP scope per brief |
| Analytics dashboard | Nice-to-have; no metric collection layer yet |
| Email notifications | Requires transactional email provider (Resend/SendGrid); not in tech stack |
| Natural language (semantic) search | Would require embedding storage (pgvector or Turso extension); SQL LIKE is sufficient for MVP |
| AI feedback summarization | Inference cost and complexity; out of brief scope |

---

## Known Limitations & Rough Edges

- **Keyword search is SQL `LIKE`** — searching `%term%` across artifact titles, summaries, and tags. No semantic/vector search. Max 50 results returned. Typos and synonyms will miss results.
- **HTML preview is sandboxed iframe** — rendered with `sandbox="allow-scripts"` to prevent XSS; cross-origin scripts and form submissions are blocked. Complex single-page HTML apps may not render correctly.
- **No real-time enrichment status** — the gallery shows a "pending" badge for artifacts being enriched; the page must be manually refreshed to see the final summary and tags appear.
- **No retry UI for failed enrichment** — if Claude returns an error, `enrichmentStatus` is set to `'failed'` and an admin must re-trigger enrichment manually (or via the API). There is no one-click retry in the UI.
- **Invite system is link-based** — team invites are implemented as copyable links. No email is sent; the inviter must share the link manually.
- **No pagination in the gallery** — all team artifacts (filtered) are loaded in a single query. Above ~200 artifacts this could be slow; cursor-based pagination was deferred.
- **MCP server runs locally** — the stdio transport requires the MCP server to run on the same machine as Claude Desktop. There is no hosted MCP endpoint in the MVP.
- **Single Turso database** — all teams share one Turso database. Row-level team scoping enforces isolation, but there is no per-team database sharding.

