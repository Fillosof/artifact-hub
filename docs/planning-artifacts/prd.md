---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments:
  - docs/planning-artifacts/product-brief-artifact-hub.md
  - docs/planning-artifacts/product-brief-artifact-hub-distillate.md
  - docs/artifact-hub-challenge.md
workflowType: 'prd'
briefCount: 2
researchCount: 0
projectDocsCount: 1
classification:
  projectType: saas_b2b
  domain: Enterprise Internal Tooling (AI Content Management)
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - Artifact Hub

**Author:** Yurii
**Date:** 2026-04-14

---

## Executive Summary

Teams across the company generate AI artifacts constantly — mockups, presentations, reports, documentation — across Claude, GPT, Gamma, Midjourney, and whatever tool comes next. The output is valuable. What happens after is not: files land in blob storage, get shared via expiring URLs pasted into Slack, and feedback scatters across threads. A week later, the link is dead and the context is gone. Every tool switch makes it worse — artifacts from the old tool become orphans, context gets lost at the boundary, teams duplicate work they didn't know existed.

**Artifact Hub** is the stable layer underneath all the tools. A platform for publishing, browsing, reviewing, and discovering AI-generated content across teams.

**How publishing works:**
- *MCP-compatible tools* (Claude Desktop, Copilot): publish in-session via conversational command. Requires one-time API key configuration; once set up, no tab switch, no upload form.
- *All other tools* (Gamma, Midjourney, GPT, etc.): upload via web UI with an optional link back to the source URL in the originating tool.
- *API and Slack bot*: next-step integrations to reduce friction further.

Either path lands the artifact in a persistent, browsable, team-visible catalog — not a Slack thread, not a pre-signed URL that expires in 24 hours.

**Who this is for — three real scenarios:**

1. *The PM who exports a Gamma strategy deck after a session* — uploads it to the Hub, links back to the Gamma source, and the VP finds it three days later without a Slack ping. The comments live on the artifact, not buried in a thread.
2. *The engineer using Claude Desktop who says "publish this architecture diagram to the hub"* — it appears in the team catalog, auto-tagged and summarized, without leaving the conversation.
3. *The team lead who opens the gallery on Monday morning* — sees what four teammates generated with AI tools last week, spots a duplicate analysis before it becomes two weeks of parallel work.

**What the reviewer's job actually is:** Leave structured comments on specific artifacts — not approvals, not ratings, not threading. A comment box with attribution, timestamps, and permanence on the artifact record. Future iterations add notification and routing; MVP is the record itself.

### What Makes This Special

**Two distinct publish paths, one catalog.** Most artifact tools force a single ingestion model. Artifact Hub accommodates the reality that some tools support MCP and most don't — without compromising the browsing, review, and discovery experience for either path.

**AI does the metadata busywork.** On every publish, Claude auto-generates tags and a short summary from artifact content. Enrichment is best-effort and async — the artifact is available immediately; tags and summary populate within seconds. If enrichment fails, the artifact is still published with no tags and the user can add them manually.

**The core insight:** The problem isn't messy file storage — it's context loss at tool boundaries. The more AI tools a team adopts, the worse fragmentation gets. Artifact Hub is the organizational memory for AI-generated work that survives tool changes.

### Measures of Success (MVP Evaluation Scope)

- Publish flow completes in ≤ 3 steps for web upload; ≤ 1 conversational turn for MCP
- A non-technical user can publish, browse, and comment without guidance
- MCP server: publish, search, and read tools are functional with documented tool schemas
- AI enrichment produces tags and summary on ≥ 95% of publish attempts
- System is live at a public URL; a reviewer can use it without local setup

### What "Permanent" Means

Artifacts persist until explicitly deleted by a team admin. Members cannot delete. No automated expiry. Deletion is a future governance feature; for MVP, artifacts are append-only from the member perspective.

---

## Project Classification

- **Project Type:** SaaS / B2B Web Platform (multi-team, internal enterprise)
- **Domain:** Enterprise Internal Tooling — AI Content Lifecycle Management
- **Complexity:** Medium — integration complexity (MCP auth distinct from Clerk browser sessions, AI API orchestration, HTML preview sandbox policy); no regulatory burden
- **Project Context:** Greenfield

---

## Success Criteria

### User Success

Three "aha!" moments that signal the product is working — each valid, each targeting a different persona:

- **The discovery moment:** A team lead opens the gallery and finds an artifact they didn't know existed — avoiding a duplicate analysis, or building on work they would have otherwise started from scratch. This is the cross-team visibility payoff.
- **The feedback loop closed:** A reviewer leaves a structured comment on an artifact and the creator sees it in context — on the artifact page, attributed, timestamped — instead of hunting through Slack threads. The rework cycle shortens.
- **The frictionless publish:** An engineer using Claude Desktop publishes an artifact in-session without switching tabs. The artifact appears in the team catalog, tagged and summarized, within seconds.

A non-technical user (PM, designer, executive) can complete the full publish → browse → comment flow without guidance or support.

### Business Success

- **90-day target:** 3 teams actively publishing per week (at least 1 artifact published per team per week)
- **Adoption signal:** Cross-team discovery occurring — artifacts viewed by members outside the publishing team
- **Retention signal:** Repeat publishing behavior — teams return to publish again after first artifact
- **Engagement signal:** Comments left on artifacts (feedback loop in use, not just the catalog)

### Technical Success

- Publish flow: ≤ 3 steps for web upload; ≤ 1 conversational turn for MCP
- MCP server: `publish_artifact`, `search_artifacts`, `get_artifact` functional with documented tool schemas
- AI enrichment: tags + summary generated on ≥ 95% of publish attempts; async, non-blocking; artifact available immediately on publish regardless of enrichment status
- Upload limit enforced: files > 10MB rejected with an error message that states the file exceeds the 10MB limit
- Auth: all routes require Clerk authentication; artifact access requires team membership
- MCP client auth: API key mechanism separate from Clerk browser sessions, documented for Claude Desktop setup
- HTML preview: sandboxed iframe with scripts disabled (no isolated subdomain required for MVP)
- Zero hard-coded credentials; all secrets via environment variables
- System live at public URL; usable by a reviewer without local setup

### Measurable Outcomes

| Outcome | Measure | Target |
|---|---|---|
| Publish friction | Steps to publish via web | ≤ 3 |
| MCP publish | Conversational turns | ≤ 1 (after one-time setup) |
| AI enrichment reliability | % of publishes with tags+summary | ≥ 95% |
| Team adoption | Active publishing teams/week | 3 teams @ 90 days |
| Onboarding | Time to first artifact published | < 5 min from account creation |
| Discoverability | Can find artifact by tag/type/team filter | Pass |

## Product Scope

### MVP — Minimum Viable Product

- Artifact publishing: web upload (images, PDFs, HTML) with title and optional source URL linking back to originating tool
- AI auto-generated tags and summary on every publish (async, best-effort)
- Gallery/catalog browsing with filtering by tag, type, and team
- Artifact detail page with inline preview (images: native; PDFs: browser embed; HTML: sandboxed iframe, scripts disabled; other: download fallback)
- Structured comments on artifacts (attribution, timestamp, permanent record)
- Multi-team model: member and admin roles; one user can belong to multiple teams; self-serve team creation
- MCP server: `publish_artifact`, `search_artifacts`, `get_artifact` (3 tools; API key auth for MCP clients)
- Stable authenticated URLs for all artifacts (no expiring links, no anonymous access)
- Admin can delete artifacts; members cannot
- Clerk authentication; team membership and roles in Turso
- Vercel Blob for file storage; Turso + Drizzle for metadata
- Deployed to Vercel at a public URL

### Growth Features (Post-MVP)

- API integration for non-MCP tools (programmatic publish without web upload)
- Slack bot (publish and search from Slack)
- MCP `add_comment` tool (4th MCP tool)
- Notifications (email/in-app when artifact published or commented on)
- Analytics dashboard (artifacts per team, views, engagement)
- Approval/review routing workflows
- Version history / artifact revisions
- Bulk upload

### Vision (Future)

- Gamma, Midjourney, and other tool-native integrations (direct publish without export step)
- Natural language search across the catalog (Turso native vector search)
- AI-powered feedback summarization across multiple reviewers
- Cross-org artifact sharing (external stakeholders with time-limited access)
- **Artifact provenance and lineage:** version history with branching — track which sources, prompts, inputs, and prior artifacts were used to create each output. When an artifact is derived from another ("based on v2 of the strategy deck"), that relationship is captured. Enables full context tracing: what was the AI told, what did it produce, what changed between versions. The source URL field in MVP is the seed of this layer.
- AI governance layer: provenance tracking, compliance reporting, content policy controls (the provenance layer above feeds directly into this)
- Browser extension for one-click publish from any AI tool web interface

---

## User Journeys

### Journey 1: The Content Creator (Web Upload — Primary Success Path)

**Persona:** Lena, a PM. She's just finished a Gamma deck for the Q3 strategy review. It took two hours with AI assistance and it's good. In the past she'd paste a Gamma share link into #product-team and ping three people — and two weeks later that link would be dead, the replies scattered across a thread she'd have to scroll to find, and nobody would remember which version got approved.

**Opening scene:** She opens Artifact Hub, signs in with her company account, and navigates to the publish page. She's already a member of the Product team.

**Rising action:** She uploads the exported PDF, types the title "Q3 Strategy Draft v1", pastes the Gamma source URL into the optional source link field, and clicks Publish. No tags to fill in, no description to write — the form is done in under 60 seconds.

**Climax:** Within seconds the artifact page loads. Tags have appeared — ["strategy", "Q3", "planning", "roadmap"] — and a short AI-generated summary sits beneath the title. She copies the artifact URL and pastes it into Slack with a single note: "feedback welcome by Friday."

**Resolution:** The artifact is permanent. The comments that arrive over the next two days are on the page — attributed, timestamped, in one place. On Friday she opens the artifact and reads four comments without searching a single Slack thread. The decision gets made. The context stays.

**Capabilities revealed:** Web upload form; source URL field; AI enrichment on publish; artifact detail page with metadata; stable shareable URL; structured comments.

---

### Journey 2: The Reviewer (Triggered by Slack Link — Primary Review Path)

**Persona:** Marcus, a design team lead. He gets a Slack message from an engineer: "Here's the API documentation I generated with Claude — [Hub artifact link]. Let me know if the structure works."

**Opening scene:** Marcus clicks the link. He's already authenticated via Clerk — the artifact page loads immediately. He's not a member of the Engineering team but is a member of Design, and the artifact is scoped to Engineering — this raises an access question.

*Note: For MVP, cross-team artifact access requires team membership. Marcus would need to be added to the Engineering team or the artifact re-published to a shared team. The denied state must identify the artifact's team and tell Marcus the next step, such as requesting access or contacting a team admin — not a generic 403.*

**Rising action (happy path — Marcus is in the team):** The artifact page shows an inline preview of the HTML documentation. He scrolls through it. He has a structural concern about the authentication section.

**Climax:** He clicks "Add Comment," types his feedback directly on the page: "The auth flow description in section 3 doesn't match what we agreed in the design review last week — can we revisit?" It's attributed to him, timestamped, attached to the artifact.

**Resolution:** The engineer sees the comment when they return to the artifact page. The feedback is precise, contextual, permanent. No "wait which Slack thread was this?" — the artifact is its own conversation record.

**Capabilities revealed:** Auth-gated artifact access; team membership enforcement with clear denial messaging; inline preview; comment form with attribution; comment visibility on artifact page.

*Reviewer discovery via Hub notifications is post-MVP. For MVP: creator shares stable Hub URL in Slack manually; Hub's value is that the URL is permanent and feedback lives on the artifact, not in the thread.*

---

### Journey 3: The MCP-Connected Engineer (In-Session Publish)

**Persona:** Dev, a backend engineer. He's in a Claude Desktop session, working through an architecture decision. He's generated a diagram and explanation of the proposed event-driven messaging pattern for the new notification service. It's exactly the kind of thing that should be visible to the team — but in the past it would live in a Claude conversation that nobody else would ever see.

**Opening scene:** Dev has Artifact Hub configured as an MCP server in Claude Desktop (one-time setup: he added the API key to his Claude config file last week).

**Rising action:** Without leaving the conversation, he types: "Publish this architecture diagram and explanation to the hub under the Backend team." Claude calls `publish_artifact` with the content, team slug, and a generated title.

**Climax:** Claude responds: "Published. Artifact available at [Hub URL]. Tags generated: ['architecture', 'messaging', 'notifications', 'event-driven']."

**Resolution:** Dev pastes the URL into the team channel. The artifact is in the catalog, tagged, summarized, browsable by every Backend team member. The decision context didn't leave the conversation — it became part of the team's permanent record.

**Capabilities revealed:** MCP server `publish_artifact` tool; API key auth for MCP clients; team lookup by slug; AI enrichment triggered on MCP publish; artifact immediately available post-publish.

---

### Journey 4: The Team Admin (Team Management + Artifact Governance)

**Persona:** Priya, an engineering manager. She set up the Backend team on the Hub when it launched. Three months in, a contractor's engagement ended and their artifacts need to be reviewed — some are stale experiments that should be cleaned up to keep the catalog useful.

**Opening scene:** Priya opens the Hub, navigates to the Backend team's artifact gallery. She can see all artifacts published by all members, including the contractor.

**Rising action:** She spots two artifacts marked "experimental" that are clearly outdated — superseded by what's now in production. She opens each artifact page.

**Climax:** As a team admin, she sees a Delete option the regular members don't. She deletes both artifacts after confirming. She also removes the contractor from the team membership list, revoking their access.

**Resolution:** The catalog reflects the team's actual current work. The deleted artifacts are gone — no expiry confusion, no zombie links. The contractor's access is cleanly revoked at the team level.

**Capabilities revealed:** Admin role on team; delete artifact (admin only); team membership management (add/remove members, assign roles); member role cannot delete artifacts.

---

### Journey Requirements Summary

| Journey | Capabilities Required |
|---|---|
| Web Upload Creator | Upload form, source URL field, AI enrichment, artifact detail page, stable URL, comments |
| Reviewer via Slack Link | Auth-gated access, team membership check + clear denial UX, inline preview, comment form |
| MCP Engineer | MCP server (publish tool), API key auth, team lookup, AI enrichment, artifact URL return |
| Team Admin | Admin role, delete artifact, team membership management (add/remove/role) |

**Cross-journey gaps to address in requirements:**
- Cross-team access model: what happens when a reviewer isn't in the publishing team? Must surface a clear, actionable error — not a generic 403.
- MCP auth setup: one-time configuration must be documented clearly enough that a non-expert can follow it.

---

## Domain-Specific Requirements

### Data Confidentiality

Artifact Hub operates on internal enterprise content — strategy decks, unreleased designs, confidential analyses — that teams need to trust the platform with before they will publish sensitive work to it.

- **Artifact file access is authenticated-only.** Raw Vercel Blob URLs must never be exposed directly to clients. All file access goes through authenticated Next.js API routes that verify Clerk session + team membership before proxying or redirecting. Blob storage URLs are server-side only; the client never sees them.
- **All artifact metadata and content is team-scoped.** Browsing, search, and MCP queries return only artifacts the authenticated user has team membership for.
- Vercel / Turso / Clerk infrastructure is acceptable for internal enterprise content at MVP scope (no on-premises or private cloud requirement).

### AI Enrichment — Hybrid Model

Enrichment (tags + summary) follows a dual-path model depending on publish source:

**MCP publish path:**
```
publish_artifact(title, content, team, tags?, summary?)
    │
    ├─ tags/summary provided by MCP client?
    │   ├─ YES → use them, skip server enrichment, normalize + cap to 8
    │   └─ NO  → trigger server-side enrichment (async, Claude API)
    │               → tags + summary appear within seconds of publish
    └─ Artifact available immediately either way
```

**Web upload path:**
- Always triggers server-side enrichment (async, non-blocking)
- Artifact available immediately; tags + summary populate within seconds

**MCP client enrichment is preferred when provided** — Claude Desktop generates tags from full conversational context, yielding higher quality than cold file analysis. Server enrichment is the guaranteed fallback.

**`publish_artifact` tool signature:**
```
publish_artifact(
  title: string,
  content: string | file_url,
  team: string,        // team slug
  tags?: string[],     // max 8, normalized server-side
  summary?: string     // if omitted, server generates
)
```

**If Claude API is unavailable:** artifact publishes with no tags/summary; owner can add tags manually or trigger re-enrichment when API recovers.

### Tag Model

- **Free-form with normalization:** lowercase, trimmed, deduplicated, hyphens allowed, special characters stripped
- **Cap: 8 tags per artifact** — applies uniformly to AI-generated (server or client) and manually added tags. Excess trimmed by relevance score.
- **Context-aware AI tagging rules** applied during server-side enrichment:

| Context signal | Rule applied |
|---|---|
| File type | PDFs → document structure + purpose; Images → subject + style; HTML → tool/topic type |
| Team context | Pass team name + existing team tags as hints — encourages natural vocabulary convergence |
| Source URL present | Extract originating tool name (gamma.app → "gamma", figma.com → "figma") and auto-tag |
| Title signals | Extract temporal markers ("Q3"), function ("strategy", "api"), format ("docs") |
| MCP context | If MCP client provides optional context summary, use to sharpen tags |

- **No global taxonomy or controlled vocabulary in MVP** — tags are emergent and browsable via filter
- **Post-MVP:** tag autocomplete from existing team tags in the input field — natural convergence without enforcement

### Post-Publish Tag and Summary Editing

Artifact owner and team admin can edit tags and summary after publish at any time:

- **Tags:** displayed as removable chips; owner clicks to remove; free-text input to add new tags (normalized on save, cap enforced)
- **Summary:** editable free-text field on artifact detail page
- **"Regenerate with AI" button:** triggers fresh server-side enrichment — re-reads file content, calls Claude API, replaces current tags and summary. Available to owner and admin. Useful when initial enrichment was poor quality or MCP client skipped enrichment.

### MCP Security Surface

- **Per-user MCP API keys.** Each user generates their own API key from Artifact Hub account settings. MCP client config references this personal key. Every MCP publish, search, and read is attributable to a specific user.
- API keys stored hashed server-side (never plaintext). Lost keys can be regenerated; old key immediately invalidated.
- MCP API keys are scoped to the user's team memberships — MCP calls cannot access or publish to teams the user doesn't belong to.
- MCP server validates API key on every request; no session state between calls.

### Risk Mitigations

| Risk | Mitigation |
|---|---|
| Raw Blob URLs bypassing auth | Files accessed via server-side proxy route only; Blob URLs never sent to client |
| MCP key leakage (key stored in Claude config file) | Per-user keys limit blast radius; self-serve revocation; scope limited to user's teams |
| AI enrichment failure blocking publish | Async enrichment; publish completes immediately regardless; manual fallback always available |
| Poor enrichment quality (MCP client skips tags) | Server-side fallback triggers automatically when tags/summary absent |
| Tag fragmentation over time | Normalization on save; team tag hints in enrichment prompt encourage convergence |
| Sensitive artifact indexed by search | Search respects team membership; no cross-team results |

---

## Innovation & Novel Patterns

### Detected Innovation Areas

**AI Agent as Publishing Actor (MCP-Native)**

Artifact Hub inverts the traditional artifact management model. In every existing platform, a human uploads content to a system. In Artifact Hub, the AI agent itself is a first-class publisher — `publish_artifact` is a tool the LLM calls directly from inside the conversational session. The agent can also enrich its own publish by passing tags and summary it generated from full conversational context, yielding higher-quality metadata than any post-hoc analysis of file bytes.

This is the "AI agents" innovation signal for SaaS/B2B: the product doesn't just support AI-generated content, it treats AI agents as autonomous actors in the content lifecycle.

**Context-Aware Hybrid Enrichment Pipeline**

The enrichment model adapts based on publish source:
- MCP client provides tags/summary → used directly (agent knows the conversation context)
- MCP client omits them → server-side enrichment triggers automatically
- Server enrichment applies context-aware rules: file type signals, team vocabulary hints, source URL tool extraction, title parsing

This is not a single model making a single call. It's a source-aware, context-switching pipeline that produces progressively better metadata as teams use the system (team vocabulary grows → hints improve → tags converge naturally).

**Organizational Memory Beneath Tool Fragmentation**

The product's core positioning — as the stable layer that survives tool changes — is a category-level innovation. The problem it names ("context loss at tool boundaries") has not been identified or addressed by any existing tool category. DAMs optimize for marketing asset reuse. Wikis optimize for structured documentation. Developer portals optimize for engineering catalogs. None are designed for the lifecycle of AI-generated ephemeral content that crosses tool boundaries. Artifact Hub defines this category.

### Validation Approach

| Innovation claim | How to validate at MVP |
|---|---|
| MCP agent-as-publisher feels natural | End-to-end test: publish via Claude Desktop in ≤ 1 conversational turn, artifact appears in catalog |
| Hybrid enrichment produces useful tags | Compare MCP-enriched vs. server-enriched output quality across 10+ publishes |
| Team vocabulary convergence over time | Check tag diversity after 50+ publishes — vocabulary should narrow, not grow unboundedly |
| Organizational memory reduces duplication | User can find existing artifact via search/browse before starting equivalent work |

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| MCP setup friction undermines agent-publisher claim | One-time setup must be documented with exact steps; misconfiguration = lost trust |
| Enrichment quality variance (MCP client vs. server) | Post-publish editing + "Regenerate" button as universal escape hatch |
| "Organizational memory" claim requires catalog density | Cold-start problem — teams need seeding content; building team publishes during dev |
| Category innovation may be ahead of market readiness | MVP scope is tight and demonstrably useful even with 1 team — proof of concept doesn't require full adoption |

---

## SaaS/B2B Specific Requirements

### Project-Type Overview

Artifact Hub is an internal multi-team SaaS platform — no external customers, no pricing model, no subscription tiers. All authenticated users have equal access to the platform; capability differences are role-based within teams, not tier-based. The internal deployment model simplifies compliance and billing concerns but introduces cold-start and adoption dynamics typical of internal tooling: the product must earn usage through genuine utility, not contractual commitment.

### Tenant Model

- **Tenancy unit: Team.** Each team is an isolated context — artifacts, membership, and admin rights are all team-scoped.
- **Self-serve team creation:** Any authenticated user can create a team and becomes its first admin automatically.
- **Multi-team membership:** Users can belong to multiple teams simultaneously with independent roles per team (member in Team A, admin in Team B).
- **No cross-team artifact visibility by default.** A user sees only artifacts in teams they belong to. No global public browse.
- **No platform-level super-admin in MVP.** Team admins govern their own teams; there is no operator/super-admin role managing all teams.

### RBAC Matrix

| Action | Member | Admin |
|---|---|---|
| Browse team artifacts | ✅ | ✅ |
| Publish artifact to team | ✅ | ✅ |
| Comment on artifact | ✅ | ✅ |
| Edit own artifact tags/summary | ✅ | ✅ |
| Edit any artifact tags/summary | ❌ | ✅ |
| Delete artifact | ❌ | ✅ |
| Regenerate AI enrichment | ✅ (own) | ✅ (any) |
| Invite members to team | ❌ | ✅ |
| Remove members from team | ❌ | ✅ |
| Change member roles | ❌ | ✅ |
| Delete team | ❌ | ✅ |
| Generate personal MCP API key | ✅ | ✅ |
| Revoke own MCP API key | ✅ | ✅ |

### Subscription Tiers

Not applicable. Internal tool with no pricing model. No quotas, storage limits, or per-seat restrictions in MVP. Upload size limit (10MB per artifact) is a technical constraint, not a tier gate.

### Integration List

| Integration | Status | Notes |
|---|---|---|
| MCP server (`publish_artifact`, `search_artifacts`, `get_artifact`) | MVP | Per-user API key auth |
| REST API (programmatic publish/search) | Post-MVP | Enables non-MCP tool integrations |
| Slack bot | Post-MVP | Publish and search from Slack |
| Gamma direct integration | Vision | Native publish without export |
| Midjourney direct integration | Vision | Native publish without export |
| SSO/SAML, LDAP/directory sync | Not planned | Clerk's built-in auth sufficient for foreseeable scope |

### Implementation Considerations

- **Cold-start strategy:** Empty catalog = low adoption. Building team should seed the Hub with their own AI artifacts during development. First publish experience must be fast enough to reward immediate repeated use.
- **Team discovery:** How does a new user find and join an existing team? Needs a join mechanism (invite link or admin-sends-invite) — without it, multi-team value is unreachable. Admin sends invite for MVP (no public team directory).
- **No platform-wide search in MVP.** Search is scoped to teams the user belongs to. A user who belongs to 3 teams sees results across all 3.

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience-first MVP. The evaluation criteria weight UX quality and MCP flow depth most heavily. The MVP must demonstrate that:
1. A non-technical user (PM, designer, exec) can publish, browse, and comment without guidance — the experience is clear enough that no tutorial is needed.
2. The MCP flow feels natural to an engineer — configure once, publish in-session, artifact appears in catalog. Not a demo, a workflow.

Architecture quality is the foundation that makes these two things possible — clean boundaries, extensible data model — but it is means, not end.

**Resource profile:** Solo developer, 2-day timebox. Every implementation decision should optimize for working software over comprehensive coverage. If a choice exists between a polished core flow and a broader but rougher feature set, polish the core.

**Risk-based cuts:** If time runs short, cut depth of the admin/governance journeys (team management, delete flows) before cutting the publish or browse experience. The MCP server's 3 core tools are non-negotiable.

### Risk Mitigation Strategy

**Technical risks:**

| Risk | Mitigation |
|---|---|
| HTML preview sandbox complexity | Sandboxed iframe with scripts disabled — no isolated subdomain needed; implement last, after images and PDFs |
| MCP auth mechanism (API keys vs Clerk) | Design and implement MCP auth route first — unblocks all MCP tool development |
| Claude API latency on enrichment | Async enrichment — publish route returns immediately, enrichment updates artifact in background |
| Vercel Blob authenticated proxy | Implement file proxy route early — all file access depends on this |

**Market/adoption risks:**

| Risk | Mitigation |
|---|---|
| Cold-start empty catalog | Seed with real AI artifacts during development; first demo must show a populated gallery |
| MCP setup friction | Provide exact Claude Desktop config JSON in docs; test with a real Claude Desktop instance before submission |
| "Why not just Slack?" skepticism | The reviewer journey must demonstrably be better — comments on artifact vs. buried thread context |

**Timebox risks:**

| Risk | Mitigation |
|---|---|
| Running out of time | Strict priority: publish flow → browse/gallery → artifact detail + preview → comments → MCP server → admin features |
| Scope creep during implementation | Any feature not in the MVP list above requires explicit decision; default is defer |

---

## Functional Requirements

### Authentication & Identity

- **FR1:** Users can sign up and sign in using Clerk authentication (email/password or OAuth)
- **FR2:** Users can generate a personal MCP API key from their account settings
- **FR3:** Users can revoke their MCP API key and generate a new one
- **FR4:** All application routes require authentication; unauthenticated requests are redirected to sign-in

### Team Management

- **FR5:** Authenticated users can create a new team and become its first admin automatically
- **FR6:** Team admins can invite users to their team by generating an invite link or sending an invite
- **FR7:** Team admins can remove members from their team
- **FR8:** Team admins can change a member's role (member ↔ admin)
- **FR9:** Team admins can delete their team
- **FR10:** Users can belong to multiple teams simultaneously with independent roles per team
- **FR11:** Users can see all teams they belong to

### Artifact Publishing

- **FR12:** Members can publish an artifact to a team by uploading a file (images, PDFs, HTML) with a title
- **FR13:** Members can optionally provide a source URL linking back to the originating tool when publishing
- **FR14:** Members who upload files exceeding 10MB receive an error message stating that the file exceeds the 10MB limit
- **FR15:** The system auto-generates tags and a summary for every published artifact via AI enrichment (async, non-blocking)
- **FR16:** MCP clients can provide tags and summary when publishing; server-side enrichment is skipped when both are provided
- **FR17:** Server-side enrichment uses context-aware rules: file type signals, team vocabulary hints, source URL tool extraction, and title parsing
- **FR18:** Artifacts are available immediately after publish regardless of enrichment status

### Artifact Discovery & Browsing

- **FR19:** Members can browse a gallery of all artifacts published to teams they belong to
- **FR20:** Members can filter the gallery by tag, file type, and team
- **FR21:** Members can search artifacts across all their teams by keyword
- **FR22:** Each artifact has a stable, permanent URL requiring authentication and team membership to access
- **FR22A:** Authenticated users who open an artifact URL without the required team membership receive an access-denied screen that identifies the artifact's team and explains the next step, such as requesting access or contacting a team admin

### Artifact Detail & Preview

- **FR23:** Members can view an artifact detail page showing title, AI-generated summary, tags, source URL, publisher, and publish date
- **FR24:** Image artifacts (PNG, JPG, GIF, WebP) are rendered inline via native image preview
- **FR25:** PDF artifacts are rendered inline via browser embed
- **FR26:** HTML artifacts are rendered inline in a sandboxed iframe with scripts disabled
- **FR27:** Unsupported file types present a download fallback
- **FR28:** Artifact files are accessed through authenticated server-side routes only; raw storage URLs are never exposed to clients

### Tags & Enrichment Management

- **FR29:** Artifact owners can edit tags on their artifact (add, remove individual tags)
- **FR30:** Team admins can edit tags on any artifact in their team
- **FR31:** Artifact owners can edit the AI-generated summary on their artifact
- **FR32:** Artifact owners can trigger server-side AI re-enrichment ("Regenerate with AI") to replace current tags and summary
- **FR33:** Tags are normalized on save (lowercase, trimmed, deduplicated, max 8 per artifact)

### Comments & Feedback

- **FR34:** Members can leave a structured comment on any artifact in their teams
- **FR35:** Comments display with author attribution and timestamp
- **FR36:** All comments on an artifact are visible on the artifact detail page
- **FR37:** Comments are permanent — they cannot be deleted in MVP

### Artifact Governance

- **FR38:** Team admins can delete any artifact in their team
- **FR39:** Members cannot delete artifacts
- **FR40:** Deleted artifacts are removed permanently with no recovery in MVP

### MCP Server

- **FR41:** MCP clients can authenticate to the MCP server using a per-user API key
- **FR42:** MCP clients can publish an artifact to a team via the `publish_artifact` tool, providing title, content, team slug, and optionally tags and summary
- **FR43:** MCP clients can search artifacts across the user's teams via the `search_artifacts` tool, with optional tag and team filters
- **FR44:** MCP clients can retrieve full artifact details including comments via the `get_artifact` tool
- **FR45:** MCP server operations are scoped to the authenticated user's team memberships — cross-team access is not possible
- **FR46:** MCP server returns the artifact URL upon successful publish

---

## Non-Functional Requirements

### Performance

- Gallery/catalog initial render: within 2 seconds on a connection with at least 10 Mbps download bandwidth
- Artifact publish response (web upload): upload confirmation returned within 3 seconds of file submission; AI enrichment is async and does not block this
- Artifact detail page load: page content visible and image/PDF preview loading started within 2 seconds
- MCP tool responses (`publish_artifact`, `search_artifacts`, `get_artifact`): within 3 seconds per call at MVP target load (up to 10 teams, 50 concurrent users, and 500 artifacts)
- AI enrichment (server-side): tags and summary appear on the artifact page within 10 seconds of publish completing, either automatically on the open page or after one page refresh
- File downloads: initiated within 2 seconds of request

### Security

- All artifact file access routed through authenticated Next.js API routes; raw Vercel Blob URLs never exposed to clients (FR28)
- All data in transit encrypted via HTTPS (enforced by Vercel)
- MCP API keys stored hashed server-side; never returned in plaintext after generation
- Clerk session tokens used for all web browser authentication; API keys used exclusively for MCP client authentication — no crossover
- Claude API key stored as server-side environment variable only; never included in client bundles or API responses
- File upload validated for MIME type and size server-side (10MB cap); client-side validation is UX-only and not a security boundary
- HTML artifact preview rendered in sandboxed iframe (`sandbox` attribute, no `allow-scripts`); no JavaScript execution from untrusted artifact content

### Scalability

- Target: supports up to 10 teams, 50 concurrent users, and 500 artifacts at MVP launch while continuing to meet the performance targets above
- Vercel Blob and Turso provide horizontal scaling headroom beyond MVP targets with no architectural changes required
- No caching layer required at MVP scale; revisit at 1,000+ artifacts if browse performance degrades

### Accessibility

- Core publish, browse, and comment flows are keyboard-navigable
- Color contrast meets WCAG 2.1 AA for text elements
- Form inputs have associated labels; error messages identify the affected field and the corrective action required
- Image previews include alt text derived from artifact title
- Not targeting full WCAG 2.1 AA compliance for MVP — accessibility is a baseline, not a certification target

### Reliability

- Vercel deployment target: 99.9% uptime (Vercel SLA; no additional infrastructure required)
- Publish failure (network, server error): user receives an error message describing what failed and the next retry step; no silent failures
- AI enrichment failure: artifact publishes successfully; failure is logged server-side; user can trigger manual re-enrichment
- MCP tool errors: return structured error responses per MCP spec; no unhandled exceptions exposed to client

### Maintainability

- Components stay under 200 lines; single responsibility per file
- Zero hard-coded credentials; all secrets via environment variables
- TypeScript strict mode; no `any` unless unavoidable and documented
- Database schema managed via Drizzle migrations; no manual SQL changes to production
