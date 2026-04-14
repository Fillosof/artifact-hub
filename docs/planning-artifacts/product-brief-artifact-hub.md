---
title: "Product Brief: Artifact Hub"
status: "complete"
created: "2026-04-14"
updated: "2026-04-14"
inputs:
  - docs/artifact-hub-challenge.md
---

# Product Brief: Artifact Hub

## Executive Summary

Every team in the company now uses AI tools — Claude, GPT, Gamma, Midjourney — to generate mockups, presentations, reports, and documentation. The output is valuable. What happens next is not: files land in blob storage, get shared via expiring URLs pasted into Slack, and feedback scatters across threads. A week later, nobody can find the artifact, the link is dead, and the review comments are buried.

Artifact Hub is the platform AI tools publish to natively. It's an internal hub for publishing, browsing, reviewing, and discovering AI-generated content across teams — with an MCP server that lets LLM clients like Claude Desktop publish, search, and manage artifacts through natural conversation. When a user generates content in Claude and says "publish this to the hub," it happens. No export, no manual upload, no tagging — AI handles the metadata automatically.

No DAM tool, wiki, or developer portal is built for AI-generated content. Artifact Hub fills the gap — purpose-built for the AI artifact lifecycle, designed for everyone from engineers to executives.

## The Problem

Teams generate AI artifacts constantly. Here's what happens to them:

- **Created** in Claude, GPT, Gamma, or Midjourney during a working session
- **Exported** to blob storage or a local download folder
- **Shared** by pasting an expiring pre-signed URL into a Slack thread
- **Reviewed** via Slack replies, DMs, or not at all
- **Lost** within days when the URL expires and the Slack thread scrolls away

There is no way to browse what exists. No structured feedback mechanism. No access control beyond URL expiry. No cross-team visibility into what other teams have generated — leading to duplicate work and missed opportunities to build on each other's outputs.

The people who feel this most: PMs assembling strategy decks, designers sharing mockup variations, engineers generating documentation, and team leads trying to review AI-assisted deliverables. Everyone has adopted the tools; nobody has a place to put the results.

## The Solution

Artifact Hub is a web platform where teams publish, browse, share, and review AI-generated content.

**Publish** — Upload artifacts (HTML, images, PDFs) with a title. AI auto-generates tags and a short summary from the content on upload, so the publish path stays near-zero friction — no manual metadata busywork.

**Browse** — A gallery/catalog view where anyone can discover artifacts across teams they have access to. Visual, filterable by tags and type, and understandable by non-technical users.

**Share** — All artifacts have stable, permanent URLs. Access requires authentication and team membership — no expiring links, no anonymous access, no access-control headaches.

**Review** — Structured comments on artifacts, replacing scattered Slack feedback. Comments are part of the artifact's permanent record — attributable, searchable, and contextual. When someone asks "why did we go with mockup B?", the answer lives on the artifact, not buried in a Slack thread from three months ago.

**MCP Server** — The headline capability. Claude Desktop (and other MCP clients) can publish artifacts, search the catalog, and read artifact details — all through natural conversation. This is what makes Artifact Hub AI-native: the AI tool itself is a first-class publishing citizen. No other artifact platform has this.

**AI-Powered Metadata** — On publish, the platform calls Claude to auto-generate descriptive tags and a short summary from artifact content. This ensures every artifact is discoverable without requiring the publisher to think about taxonomy.

**Progressive Rendering** — Full in-browser preview for supported formats (images via native rendering, PDFs via browser embed), with download fallback for unsupported types. Easiest formats first; preview support expands as time allows.

## What Makes This Different

**MCP-native — the platform AI tools publish to.** Every artifact platform will have upload forms. Artifact Hub is the first where the AI tool itself publishes natively from inside the conversation. This is a category-defining architectural choice, not a feature checkbox.

**AI does the busywork.** Auto-generated tags and summaries mean publishing is fast and the catalog stays organized without manual effort. The AI improves the product invisibly — it makes publishing easier and browsing better without making "AI" the point.

**Purpose-built for AI artifacts.** DAM tools serve marketing assets. Wikis serve documents. Developer portals serve engineering catalogs. None are designed for AI-generated content — ephemeral by nature, cross-format, needing lightweight review rather than formal approval workflows.

**Multi-team by design.** Teams are the primary organizational unit. People belong to multiple teams. Two roles (member, admin) keep permissions simple but real. This mirrors how companies actually work — not a flat permission model bolted on later.

**Built for everyone.** The UX is designed for PMs, designers, and executives — not just engineers. A non-technical user can publish, browse, and comment without guidance.

## Who This Serves

**Primary: Content creators** — Anyone using AI tools to generate work product. Engineers writing docs, designers creating mockups, PMs building presentations, analysts producing reports. They need a place to publish that's faster than Slack and more persistent than a pre-signed URL.

**Primary: Reviewers and consumers** — Team leads reviewing deliverables, colleagues browsing for inspiration or avoiding duplicate work, stakeholders checking on AI-assisted outputs. They need browsability, structured feedback, and cross-team discovery.

**Secondary: MCP-connected LLM users** — People working in Claude Desktop or other MCP clients who want to publish and search artifacts without leaving their AI conversation.

## Success Criteria

For the challenge evaluation scope:

- **UX quality**: A non-technical user can publish, browse, and comment without guidance. Publish flow completes in under 3 steps.
- **MCP integration depth**: The MCP server supports publish, search, and read with documented tool schemas. Conversational workflow feels natural.
- **LLM integration**: AI auto-tagging and summarization works on publish, demonstrably improving the experience.
- **Deployment**: Live, accessible, functional at a public URL.
- **Architecture**: Clean boundaries, extensible. Components under 200 lines. Zero hard-coded credentials.

For the product longer-term:

- Team adoption rate (teams actively publishing per week)
- Artifacts published per team per month
- Cross-team discovery (artifacts viewed by members outside the publishing team)
- Feedback engagement (comments per artifact)

## Scope

### In — MVP (2-day timebox)

- Artifact publishing with AI-generated tags and summary (via Claude API)
- Gallery/catalog browsing with filtering by tags, type, team
- Stable authenticated URLs for all artifacts (no external/anonymous sharing)
- Structured comments on artifacts
- Multi-team model: member and admin roles, one person can belong to multiple teams
- MCP server: publish, search/find, read (3 core tools)
- Progressive rendering: images (native), PDFs (browser embed), download fallback for others
- Clerk authentication
- Vercel Blob for file storage
- Deployed to Vercel with Turso database (Drizzle ORM)
- Next.js App Router, TypeScript

### Out — Deferred

- MCP comment tool (add after core 3 tools are solid)
- Configurable/expiring share links (all links are stable + auth-gated for now)
- Gamma integration
- Slack bot
- Version history / artifact revisions
- Approval workflows
- Analytics dashboard
- Notifications
- NL search, feedback summarization

### Stretch (if time allows)

- MCP comment tool (4th tool)
- HTML preview rendering (sandboxed iframe)
- Additional file format previews
- Bulk upload

## Technical Architecture (high-level)

**Stack**: Next.js App Router, TypeScript, Drizzle ORM, Turso (libSQL), Vercel Blob, Clerk, Vercel deployment

**Storage**: Artifact files stored in Vercel Blob. Metadata (title, AI-generated summary, tags, team ownership, timestamps) in Turso via Drizzle. Upload size limit: 10MB.

**Data model (core entities)**:
- **Team** — name, slug, created_by
- **TeamMembership** — user_id, team_id, role (member | admin)
- **Artifact** — title, summary (AI-generated), file_url, file_type, team_id, created_by, created_at
- **ArtifactTag** — artifact_id, tag (AI-generated)
- **Comment** — artifact_id, user_id, content, created_at

**MCP server tools**:
- `publish_artifact` — title, file content/URL, team → returns artifact URL
- `search_artifacts` — query, optional team/tag filters → returns matching artifacts
- `get_artifact` — artifact ID → returns full details with comments

**Auth**: Clerk handles authentication. Team membership and roles managed in Turso. All routes require auth; artifact access requires team membership.

## Deliverables

1. **Running system** at a publicly accessible Vercel URL
2. **MCP server configuration** JSON for Claude Desktop
3. **WRITEUP.md** — product decisions, architecture, MCP integration, LLM usage, deployment, what's next
4. **Walkthrough** — screen recording (5 min max) or written step-by-step
5. **Claude Code session logs** in `claude-sessions/` folder

## Vision

If Artifact Hub succeeds, it becomes the system of record for AI-assisted work across the company — not just a file store, but the place where AI outputs are published, discovered, reviewed, and built upon. Over 2-3 years:

- **Integration hub**: MCP, Gamma, Slack, browser extensions — every AI tool publishes here automatically
- **Intelligence layer**: AI-powered search, auto-tagging, feedback summarization, smart routing make the catalog smarter as it grows
- **Organizational memory**: A searchable, browsable record of the company's AI-assisted work — reducing duplicate effort, surfacing best practices, and giving leadership visibility
- **Governance foundation**: Provenance tracking, usage analytics, and access control that satisfy emerging AI content compliance requirements
