# Artifact Hub — Video Presentation Scenarios

## Summary

All 8 epics are fully implemented. The presentation is split into **6 focused videos** (or one continuous recording you can chapter-mark). Each section includes prerequisites, a step-by-step script, and what to highlight on camera.

---

## Playwright MCP Answer

**Yes — Playwright MCP can drive the browser hands-free**, but with caveats:

| Use case | Playwright MCP fit |
|---|---|
| Navigating app pages, clicking, filling forms | ✅ Excellent |
| Demonstrating the gallery, filters, search | ✅ Excellent |
| Demonstrating artifact preview (image/PDF/HTML) | ✅ Good |
| Demonstrating comments | ✅ Good |
| Clerk sign-in (first-time OAuth) | ⚠️ Works but slow — do it manually first, let Playwright reuse cookie session |
| Demonstrating MCP server (Claude Desktop) | ❌ Better done live in Claude Desktop — recording a terminal is cleaner |
| File drag-and-drop upload | ⚠️ Playwright can upload files via `setInputFiles`, but the visual drag-and-drop effect won't show |

**Recommended workflow:** Use Playwright MCP for the web UI walkthroughs (Videos 2–5). Record Claude Desktop screen separately for the MCP video (Video 6). Use OBS or macOS QuickTime for screen capture.

**Setup for Playwright MCP:**
```bash
# Install Playwright MCP server
npx @playwright/mcp@latest

# Add to Claude Desktop config:
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Then in Claude Desktop: *"Open the browser, go to [your app URL], and walk through the artifact gallery."*

---

## Global Prerequisites (all videos)

| Item | Action required |
|---|---|
| App deployed to Vercel | Confirm URL is live — run `vercel --prod` if not |
| Clerk configured | Sign-in / sign-up pages work at `/sign-in` and `/sign-up` |
| Turso DB seeded | See "Seed Script" section below |
| MCP server built | `npm run build:mcp` passes with exit 0 |
| Claude Desktop installed | With Artifact Hub MCP config in `claude_desktop_config.json` |
| Screen recorder ready | OBS, QuickTime, or Loom |
| Browser: Chrome/Arc | Full-screen, no personal bookmarks visible, zoom at 100% |

### Seed Script (run once before recording)

Create these accounts and data so they exist when you start recording:

**Accounts:**
- **alice@demo.com** / Demo123!Pass) — team admin of "Design Team"
- **bob@demo.com** / Demo123!Pass) — member of "Design Team", admin of "Engineering Team"
- **carol@demo.com** / Demo123!Pass) — member of "Engineering Team" only

**Teams:**
- `design-team` — "Design Team" (alice = admin, bob = member)
- `engineering-team` — "Engineering Team" (bob = admin, carol = member)

**Artifacts (pre-seeded in "Design Team"):**
- `mockup-homepage.png` — Image artifact, tags: [ui, mockup, homepage], summary AI-generated
- `q2-strategy.pdf` — PDF artifact, tags: [strategy, q2, planning]
- `landing-page.html` — HTML artifact, tags: [html, landing-page, prototype]
- `data-export.csv` — CSV artifact (fallback download path), tags: [data]

**For "Engineering Team":**
- `api-docs.pdf` — PDF artifact, tags: [api, documentation]

**Alice's MCP API key** — pre-generated and noted down; you'll use it in Video 6.

---

## Video 1 — Authentication & First-Time Setup (3 min)

**Goal:** Show sign-up, sign-in, and route protection.

### Prerequisites
- Fresh Clerk account (not yet signed in on the browser)
- App URL open in incognito window

### Script

1. **Open the app URL** in incognito.
   - Point out: redirected automatically to `/sign-in` — unauthenticated access is blocked.

2. **Click "Sign Up"** — fill in `carol@demo.com`, DemoPass123!
   - Show: Clerk-hosted form, email verification flow (if enabled) or instant sign-up.
   - After sign-up, redirected to the dashboard.

3. **Highlight the dashboard** — it's empty because carol has no team yet.
   - Point out: *"Every route is protected — zero configuration needed beyond Clerk middleware."*

4. **Sign out** — click user avatar → Sign Out.
   - Show: redirected back to `/sign-in`.

5. **Sign in as alice@demo.com** — lands on her dashboard with pre-seeded data.

**What to highlight:**
- Instant redirect to sign-in on unauthenticated access (route protection)
- No custom auth code — Clerk handles it
- Clean redirect back to original destination after sign-in

---

## Video 2 — Team Management (4 min)

**Goal:** Create a team, invite a member, change roles, manage settings.

### Prerequisites
- Signed in as alice@demo.com
- "Design Team" already exists
- bob@demo.com exists as a Clerk user but is NOT yet a member (so you can invite)

### Script

1. **Show the team switcher** in the sidebar — alice sees "Design Team."
   - Click **"Create New Team"** → fill in name "Marketing Team" → submit.
   - Show: new team appears in sidebar immediately; alice is its admin.

2. **Navigate to Team Settings** for "Marketing Team."
   - Show the **Invite Member** section — generate an invite link or enter bob's email.
   - Copy the invite link.
   - Open a new incognito window, sign in as bob, paste the link → bob joins.

3. **Back as alice** — refresh Settings → bob appears in the member list as "member."
   - **Change bob's role** to "admin" — show the role dropdown, confirm.
   - **Change it back** to "member."

4. **Remove bob** from the team — show the confirmation dialog.

5. **Delete the "Marketing Team"** — navigate to Danger Zone in settings, confirm deletion dialog.

**What to highlight:**
- Multi-team membership (bob is in Design Team AND Engineering Team)
- Role-based controls: only admins see invite/remove/delete buttons
- Destructive actions have confirmation dialogs (UX safety)

---

## Video 3 — Publishing Artifacts & AI Enrichment (5 min)

**Goal:** Upload files via drag-and-drop, show AI auto-tagging in real time.

### Prerequisites
- Signed in as alice@demo.com in "Design Team"
- Have 3 local files ready to upload:
  - `new-mockup.png` (any image < 10MB)
  - `report.pdf` (any PDF < 10MB)
  - `component-demo.html` (small HTML file)
- Gallery should have some existing artifacts (pre-seeded)

### Script

1. **Show the empty "New Artifact" CTA** in the sidebar.
   - Alternatively, drag `new-mockup.png` onto the gallery area — the drop zone activates with visual feedback.

2. **Publish dialog opens** — show it auto-focused on the Title field.
   - Fill in: Title = "Homepage Redesign Mockup"
   - Optional: expand "Source URL" toggle → paste `https://claude.ai`
   - Click **Publish**.

3. **Artifact appears in the gallery immediately** — show the skeleton loaders where tags and summary will appear.
   - Wait ~5 seconds → tags and summary populate automatically.
   - *"AI generated these — no manual tagging needed."*

4. **Click the artifact** → detail page. Show the AI-generated summary.

5. **Repeat for `report.pdf`** — faster, just to show multi-format support.

6. **Show the error case** — try uploading a file > 10MB.
   - Show: error message "File exceeds the 10MB limit."

**What to highlight:**
- Drag-and-drop with visible drag state
- Zero-friction publish: title + file only
- AI enrichment is async and non-blocking — artifact is usable immediately
- Skeleton → live content transition
- 10MB validation with clear error

---

## Video 4 — Gallery, Discovery & Search (4 min)

**Goal:** Browse, filter by tag/type/team, keyword search.

### Prerequisites
- Signed in as alice@demo.com
- "Design Team" has 4+ pre-seeded artifacts with varied tags and types
- bob@demo.com is in both "Design Team" and "Engineering Team"
- Sign in as bob for the multi-team view

### Script

1. **Signed in as bob** — team switcher shows both teams.
   - In the sidebar, switch between "Design Team" and "Engineering Team" — gallery content changes.
   - Switch to "All Teams" view — artifacts from both appear.

2. **Filter by file type** — click "Image" filter → only image artifacts remain.
   - Add "PDF" → both types shown. Clear filter.

3. **Filter by tag** — click the "mockup" tag chip → gallery narrows instantly.
   - Clear filter.

4. **Keyword search** — type "strategy" in the search box.
   - *"This searches title, summary, and tags — team-scoped, never cross-team leakage."*
   - Show "No results found" + "Clear all filters" button for a query with no results.

5. **Show the ArtifactRow zones** — hover over one row to show the hover highlight.
   - Left: file type icon / thumbnail
   - Center: title + summary snippet
   - Right: tags + date + publisher

**What to highlight:**
- Gallery renders fast (pre-loaded)
- Team switcher in sidebar — first-class multi-team UX
- Combined type + tag + search filtering
- Team-scoped queries: bob can't see carol's private teams

---

## Video 5 — Artifact Detail, Preview & Editing (5 min)

**Goal:** Show all 4 preview types, stable URL, access control, tag/summary editing, AI regeneration, and comments.

### Prerequisites
- Signed in as alice@demo.com
- 4 pre-seeded artifacts: image, PDF, HTML, CSV
- bob@demo.com is a member of "Design Team" too (to show stable URL sharing)
- carol@demo.com is NOT in "Design Team" (to show access denied)

### Script

**Preview types:**
1. **Image artifact (`mockup-homepage.png`)** — click → detail page, image renders inline. Show alt text.
2. **PDF artifact (`q2-strategy.pdf`)** — click → PDF embed in browser, scrollable.
3. **HTML artifact (`landing-page.html`)** → renders in sandboxed iframe. Try clicking a link inside — *"Scripts and navigation are disabled — safe sandbox."*
4. **CSV artifact (`data-export.csv`)** → shows download fallback card. Click download.

**Stable URL & access control:**
5. Copy the URL of the image artifact.
   - Open new incognito window, sign in as carol (not in Design Team) → show the **access-denied page**: team name shown, "Request access or return to hub" CTA.
   - Open as bob (IS in Design Team) → loads fine.
   - *"Stable, permanent URLs. Auth-gated, not expiring."*

**Editing:**
6. As alice (artifact owner), on the detail page:
   - **Edit tags** — add a new tag "v2", remove an old one → Save. Show toast "Tags Saved."
   - **Edit summary** — click the summary text, modify it → Save.
   - **Regenerate with AI** — click "Regenerate with AI" button → skeleton appears → new tags/summary appear.
   - Switch to bob's session — bob can also edit tags as admin.

**Comments:**
7. As alice, scroll to the comment section.
   - Type a comment: *"Ready for stakeholder review — please check the header contrast ratio."*
   - Submit → comment appears with alice's name and timestamp.
8. As bob (in a second window), add a reply comment.
   - *"Comments are permanent, structured feedback — no more buried Slack threads."*

**What to highlight:**
- 4 distinct preview modes in one component
- Sandboxed HTML (security)
- Access-denied page with actionable next step (not a generic 403)
- In-place tag and summary editing
- AI regeneration
- Structured, persistent, attributed comments

---

## Video 6 — MCP Server: Claude Desktop Integration (6 min)

**Goal:** Demonstrate the headline feature — AI tool publishing, searching, and reading artifacts natively.

### Prerequisites
- Claude Desktop installed and running
- `claude_desktop_config.json` has Artifact Hub MCP server configured:
  ```json
  {
    "mcpServers": {
      "artifact-hub": {
        "command": "node",
        "args": ["/absolute/path/to/mcp-server/dist/index.js"],
        "env": {
          "ARTIFACT_HUB_API_URL": "https://your-app.vercel.app",
          "ARTIFACT_HUB_API_KEY": "your-alice-api-key"
        }
      }
    }
  }
  ```
- alice's API key generated and saved (from Settings → API Keys in the web UI)
- MCP server built: `npm run build:mcp` ✅
- Split screen: Claude Desktop on left, browser showing the web UI on right

### Script

**Part A — Show the API key setup (30s)**
1. In browser, signed in as alice → go to **Settings → API Keys**.
   - Show the "Generate API Key" button → click → key appears once → copy it.
   - *"One key per user. Hashed server-side — never stored in plaintext."*
   - Show the revoke button (but don't click).

**Part B — Publish via MCP (2 min)**
2. Switch to Claude Desktop.
   - Type: *"Publish this artifact to the Design Team: title is 'Q3 Budget Analysis', content is a summary of our Q3 budget projections showing 15% growth in engineering headcount and 8% growth in marketing. Team slug is design-team."*
   - Show: Claude calls `publish_artifact` tool → returns artifact URL.
   - **Switch to browser** → refresh gallery → the new artifact appears with AI-generated tags and summary.
   - *"Alice never left her AI conversation. No upload form, no tagging — just a natural instruction."*

**Part C — Search via MCP (1.5 min)**
3. Back in Claude Desktop.
   - Type: *"Find all artifacts tagged 'strategy' in my teams."*
   - Claude calls `search_artifacts` → returns a list with titles, summaries, and URLs.
   - Type: *"Show me only PDF artifacts in the Engineering Team."*
   - Claude filters by `fileType: pdf, teamSlug: engineering-team`.

**Part D — Read artifact details via MCP (1.5 min)**
4. Type: *"Get the details of the Q3 Budget Analysis artifact including any comments."*
   - Claude calls `get_artifact` → returns full detail: summary, tags, source URL, publisher, all comments.
   - *"The AI can now reason over artifact content and comments — enabling workflows like 'summarize all feedback on this artifact'."*

**Part E — Scope enforcement (30s)**
5. Type: *"Show me artifacts from all teams in the company."*
   - Claude's search only returns alice's teams — Design Team and Engineering Team.
   - *"MCP operations are scoped to the authenticated user's team memberships. Cross-team access is impossible — enforced server-side."*

**What to highlight:**
- Natural language → structured MCP tool call → action in app
- AI auto-tagging even for MCP-published artifacts
- Three tools: `publish_artifact`, `search_artifacts`, `get_artifact`
- Security: team-scoped, API key auth, never returns raw blob URLs

---

## Bonus Clip — Admin Governance (2 min)

**Goal:** Show admin-only artifact deletion.

### Prerequisites
- Signed in as alice (admin of Design Team)
- At least one artifact in Design Team that you're willing to delete
- Sign in as carol (member) in a second window

### Script

1. As carol (member) — open an artifact detail page.
   - Show: **no delete button visible** to members.

2. As alice (admin) — open the same artifact.
   - Show: **"Delete Artifact"** button visible.
   - Click → confirmation dialog appears with destructive red button and explicit text.
   - Confirm → artifact is removed; redirected back to gallery.
   - *"Permanent deletion — no recovery in MVP. That's why we have a hard confirmation."*

---

## Recording Checklist

Before each take:

- [ ] Browser zoom at 100%, fonts readable at 1080p
- [ ] No personal data visible (bookmarks bar hidden, notifications off)
- [ ] App URL is the live Vercel deployment (not localhost)
- [ ] Pre-seeded data in place (run the seed script)
- [ ] Claude Desktop restarted fresh (clears any stale MCP state)
- [ ] Screen recorder test clip taken to confirm audio and resolution
- [ ] Each video starts on the relevant page — no searching for where to click

## Recommended Video Order for a Single Continuous Demo

1. Authentication & First-Time Setup (3 min)
2. Team Management (4 min)
3. Publishing & AI Enrichment (5 min)
4. Gallery & Discovery (4 min)
5. Artifact Detail, Preview & Editing (5 min)
6. MCP Server — Claude Desktop (6 min)
7. Admin Governance (2 min)

**Total: ~29 minutes** (or trim to a 10-minute highlight reel by cutting to key moments from each section).
