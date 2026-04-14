---
title: "Product Brief Distillate: Artifact Hub"
type: llm-distillate
source: "product-brief-artifact-hub.md"
created: "2026-04-14"
purpose: "Token-efficient context for downstream PRD creation"
---

# Product Brief Distillate: Artifact Hub

## Rejected Ideas & Deferred Decisions

- **External/anonymous shareable links with expiry** — rejected for MVP. All URLs are stable and require Clerk authentication + team membership. Simplifies auth surface significantly. Revisit when cross-org sharing becomes a need.
- **Configurable share link expiry (1h/24h/7d/30d)** — deferred. Not needed when all access is auth-gated.
- **Viewer/editor role split** — rejected for MVP. Only member and admin roles. Keeps RBAC implementation lightweight for 2-day timebox. All team members can publish and comment.
- **NL search across catalog** — deferred to post-MVP. Turso has native vector search built in, so no separate vector DB needed when this is implemented.
- **Feedback summarization via AI** — deferred. Listed in challenge as a possibility but adds complexity without core value in MVP.
- **Smart review routing based on content analysis** — deferred. Lower priority, more relevant at scale.
- **Version history / artifact revisions** — deferred. Artifacts are immutable in MVP; re-publish as a new artifact.
- **Approval workflows** — deferred. Lightweight review (comments) is sufficient; formal approvals add process overhead.
- **Analytics dashboard** — deferred. No usage tracking in MVP beyond what Vercel provides.
- **Notifications** — deferred. No email/push/in-app notifications in MVP.

## Requirements Hints

- **Publish flow must complete in under 3 steps** — user uploads file + title, AI generates tags/summary automatically. That's the entire flow.
- **MCP server must support full read cycle, not just write** — publish, search, read. Comment tool is stretch. The conversational workflow should feel natural, not like calling an API.
- **Multi-team from day one** — a person belongs to multiple teams. Team is the ownership unit for artifacts. This is not negotiable for MVP; it mirrors real org structure.
- **Progressive rendering priority order**: images (native img tag) → PDFs (browser embed/object tag) → HTML (sandboxed iframe, stretch) → everything else (download fallback).
- **Upload size limit: 10MB** — reject larger files with clear error message.
- **AI metadata generation on every publish** — Claude API call to generate tags and short summary from artifact content. This satisfies the challenge's LLM integration requirement.
- **Components should stay under 200 lines** — architectural guideline from success criteria.
- **Zero hard-coded credentials** — all secrets via environment variables.

## Technical Context

- **Stack (locked)**: Next.js App Router, TypeScript, Drizzle ORM, Turso (libSQL), Vercel Blob, Clerk auth, Vercel deployment
- **Turso key capabilities**: SQLite-compatible, Rust-based, native vector search, concurrent writes, multi-tenancy at scale. Positions itself as "the database for the Age of AI Agents."
- **Drizzle ORM**: Official libSQL/Turso support. Schema-first with TypeScript type safety.
- **Vercel Blob**: Zero-config file storage for Vercel deployments. Stores artifact files (images, PDFs, HTML, etc.).
- **Clerk**: Handles auth (sign-up, sign-in, session management). Team membership and roles are custom in Turso, NOT Clerk organizations.
- **MCP TypeScript SDK**: Reference at github.com/modelcontextprotocol/typescript-sdk. MCP spec at modelcontextprotocol.io.
- **MCP tool signatures (planned)**:
  - `publish_artifact(title, file_content/URL, team)` → returns artifact URL
  - `search_artifacts(query, team?, tags?)` → returns matching artifacts
  - `get_artifact(artifact_id)` → returns full details with comments
  - `add_comment(artifact_id, content)` → stretch goal, 4th tool

## Detailed User Scenarios

- **PM generates strategy deck in Gamma** → exports PDF → uploads to Artifact Hub with title "Q3 Strategy Draft" → AI tags it ["strategy", "Q3", "planning"] and summarizes "Quarterly strategy proposal covering market expansion and team restructuring" → shares link in Slack → team lead opens it, previews inline, leaves structured comment → PM revisits artifact page later with all feedback in one place.
- **Engineer uses Claude to generate API documentation** → says "publish this to the hub" via MCP → Claude calls publish_artifact with the content → artifact appears in team's gallery automatically with AI-generated tags → other engineers discover it while browsing, avoid duplicating the same docs.
- **Designer creates 3 mockup variations in Midjourney** → uploads all three to Hub → team browses gallery, comments on each variation with preferences → decision history preserved on the artifacts, not in Slack.
- **Exec browses cross-team gallery** → sees what design team, product team, and engineering team have been generating with AI tools → gets visibility without needing to join each team's Slack channel.

## Competitive Intelligence

- **No direct competitor** exists in "AI artifact management" — this is a whitespace category.
- **Enterprise DAM tools** (Bynder, Brandfolder, Aprimo): marketing-focused, heavy onboarding, per-seat pricing, no AI provenance, no concept of AI-generated content lifecycle.
- **Wikis** (Notion, Confluence): general-purpose, could approximate 80% of catalog functionality via databases, but no preview rendering, no MCP integration, no AI-native publish flow. "Why not a Notion workspace?" is a valid challenge — answer: MCP-native publishing and purpose-built UX for browsing/reviewing generated artifacts.
- **Developer portals** (Backstage): engineering-centric, CI/build artifact oriented, unusable for non-technical audience.
- **AI tool artifacts** (Claude Artifacts, ChatGPT Canvas, v0.dev): siloed within individual conversations, no cross-team aggregation, no persistent catalog, no structured review.
- **AI presentation tools** (Gamma, Beautiful.ai, Tome): single-format output, no hub for diverse AI outputs.
- **Key positioning defense**: MCP-native is the moat. Every platform can add upload forms; none have conversational publishing from inside the AI session.

## Integration Priority (post-MVP roadmap)

1. **MCP server** — MVP, core capability
2. **Gamma integration** — first post-MVP integration, user preference
3. **Slack bot** — second post-MVP integration
4. **Browser extension** — future
5. **Other MCP clients** (Cursor, Copilot) — free via MCP protocol

## Adoption & Cold-Start Considerations

- **Publish friction is the #1 adoption risk** — if it's harder than pasting a Slack link, nobody switches. AI auto-tagging helps by removing metadata busywork.
- **Cold-start**: empty gallery = dead gallery. Seeding strategy needed — at minimum, the building team publishes their own AI outputs during development.
- **Team onboarding**: needs to be dead simple. Likely self-serve team creation by any authenticated user, admin invites members.
- **The MCP path is the lowest-friction publish flow** — "publish this" from inside Claude is faster than any web upload form. This is the adoption accelerator.

## Open Questions

- How does team creation work? Self-serve or admin-gated? (Leaning self-serve for MVP)
- Should artifacts be movable between teams, or are they permanently owned by the publishing team?
- What happens to artifacts when a team member is removed? (Artifacts stay, comments stay, member just loses access)
- Claude API key management for auto-tagging — server-side, single API key, or per-user? (Likely single server-side key for MVP)
- Max number of tags per artifact? (Suggest 5-8 AI-generated tags)

## Scope Signals from User

- "We're short on time, need quick results" — speed of delivery is paramount
- "Nice and understandable UX for everyone" — UX polish is a top priority, not an afterthought
- "From the beginning we need to consider multiple teams" — multi-team is non-negotiable
- "AI features out of scope, probably next iterations" — later revised to include auto-tagging/summary on publish after skeptic review highlighted evaluation gap
- "MCP must not only post but also read, find, and post comments" — MCP is a rich integration, not just a write pipe (comment tool moved to stretch)
- "Full preview + download as fallback, implementing easiest preview first" — progressive rendering, pragmatic approach
