---
storyKey: 2-5-pending-team-invitations-ui
storyId: '2.5'
epic: 2
title: Pending Team Invitations UI (Accept / Decline on Teams Page)
type: 'enhancement'
status: 'ready-for-dev'
priority: 'high'
relatedTo: ['2-4-email-based-team-invitations']
createdAt: '2026-04-15'
updatedAt: '2026-04-15'
effort: 'medium'
---

# Story 2.5: Pending Team Invitations UI (Accept / Decline on Teams Page)

## Overview

Surface pending team invitations to users on the Teams page in a discoverable, actionable way. Users should see all teams they've been invited to in a dedicated section with a consistent card style matching their active teams, and be able to accept or decline each invitation in one touch. Add a visual indicator badge to the Teams navigation link if invitations are waiting.

This story completes the team invitation user journey started in Story 2.4 — moving from the invite-creation backend to the invite-acceptance frontend.

## User Story

**As a team member,**  
**I want to see pending team invitations prominently on the Teams page,**  
**So that I can quickly discover teams I've been invited to and join them with one click.**

---

## Acceptance Criteria

### Teams Page Structure

**Given** a user navigates to `/teams` with pending invitations matcing their email  
**When** the page loads  
**Then** they see three sections in this order:
1. **Pending Invitations** — list of teams inviting them
2. **Your Teams** — all teams they are currently members of
3. **Create Team** — button to create a new team (existing UX)

**Given** a user with zero pending invitations  
**When** they visit `/teams`  
**Then** the "Pending Invitations" section is not shown; only "Your Teams" appears

**Given** a user with pending invitations  
**When** they view the page  
**Then** the **Pending Invitations** heading uses a subtle visual indicator (optional badge or color accent) to signal attention without overwhelming the page

### Invitation Card UI

**Given** a pending invitation in the list  
**When** I inspect the card  
**Then** it matches the visual style of the existing "Your Teams" cards:
- Left zone: Team name in bold (same font weight as active teams)
- Middle zone: A subtle label "Pending invite · expires in X days" or similar (smaller, muted text)
- Right zone: Two action buttons stacked vertically or horizontally depending on space
  - **Accept** button (primary/solid style, zinc-900 / dark mode zinc-50)
  - **Decline** button (secondary/outline or ghost style, gray text)
- Card uses the same rounded border, hover state, and spacing as active team cards
- Invitation card uses slightly lighter background or muted styling to differentiate from active teams (e.g., `bg-zinc-50 dark:bg-zinc-900/50` vs full white/black)

**Given** I hover over an invitation card  
**When** the card is interactive  
**Then** the entire card shows a subtle background highlight (same as active team cards), and the action buttons remain clearly visible

### Accept Action

**Given** a user clicks the **Accept** button on a pending invitation  
**When** the request is sent to the API  
**Then** the route `POST /api/teams/[teamId]/members/accept` is called with the invitation ID in the request body, or a similar pattern that marks the invitation as accepted and creates a team membership

**Given** the accept request succeeds  
**When** the response is received  
**Then** the card is replaced by a success state showing:
- The team now appears in the "Your Teams" section
- The invitation card is removed from the "Pending Invitations" section
- (Optional) A toast notification shows "You've joined [Team Name]!"

**Given** the accept request fails (e.g., API error, team doesn't exist)  
**When** the error is received  
**Then** the user sees an error message on the card or in a toast: "Could not accept invitation. Please try again."

**Given** the user accepts an invitation  
**When** they refresh the page or return to `/teams`  
**Then** the team appears in the active teams list; the invitation is no longer pending

### Decline Action

**Given** a user clicks the **Decline** button on a pending invitation  
**When** the request is sent to the API  
**Then** the route `DELETE /api/teams/[teamId]/members/[invitationId]` is called (reusing existing endpoint from Story 2.4)

**Given** the decline request succeeds  
**When** the response is received  
**Then** the invitation card is removed immediately with a smooth transition
- (Optional) A toast notification shows "[Team Name] invitation declined"

**Given** the invitation is declined  
**When** the user refreshes the page  
**Then** the invitation is gone; the team does not appear in their teams list

### Navigation Indicator

**Given** a user with pending invitations  
**When** they view the header or dashboard navigation (before navigating to `/teams`)  
**Then** the **Teams** link shows a visual badge or indicator:
- Style option 1: Small red/orange dot or badge with a count (e.g., "3" pending)
- Style option 2: Subtle pill-shaped indicator next to the word "Teams" (e.g., "Teams (2)")
- Must be visible in both light and dark modes with sufficient contrast

**Given** a user with zero pending invitations  
**When** they visit the Teams page or dashboard  
**Then** the indicator is not shown on the navigation link

**Given** a user accepts or declines an invitation  
**When** the action completes  
**Then** the indicator on the Teams link updates or disappears in real-time (if the count reaches zero)

### Hydration & Auto-Accept

**Given** a user signs up or signs in with an email that matches pending invitations  
**When** they first navigate to an authenticated page (e.g., dashboard layout or `/teams`)  
**Then** the `findAndAcceptInvitations()` helper from Story 2.4 is called to auto-convert pending → accepted invitations in the background (no UI change needed for auto-accepted invites)

**Given** some invitations were auto-accepted on first load  
**When** the user navigates to `/teams`  
**Then** they see only the pending (not-yet-hydrated) invitations in the "Pending Invitations" section, and auto-accepted invitations appear in the "Your Teams" section

### Responsive Layout

**Given** the page is viewed on a mobile device (sm breakpoint)  
**When** I inspect the invitation cards  
**Then** the action buttons are stacked vertically within the card to avoid overflow
- Example: Two buttons, each taking full width, separated by a small gap

**Given** the page is viewed on a tablet or desktop (md+ breakpoint)  
**When** I inspect the invitation cards  
**Then** the action buttons can be arranged horizontally or remain stacked depending on available space (use `flex-wrap` or `gap` for natural flow)

### Edge Cases & Error Handling

**Given** a user has multiple pending invitations  
**When** they accept or decline one  
**Then** the other invitations remain unaffected and are still shown

**Given** an invitation expires while the page is open  
**When** the user attempts to accept it  
**Then** the API returns a 400 or similar error, and the UI shows: "This invitation has expired. Please request a new one from the team admin."

**Given** a user is invited to the same team twice (admin invites them twice)  
**When** they view the page  
**Then** only the latest pending invitation is shown (earlier pending invites are treated as superseded)

**Given** the user is already a member of a team and receives an invitation to that same team  
**When** they view the page  
**Then** the invitation is not shown (backend should prevent duplicate active+pending combinations)

---

## Technical Requirements

### API Changes

**GET /api/teams — Extend response** (Story 2.4 already has this endpoint)
- Response includes array of `teamInvitations` with pending status for the authenticated user's email
- No change needed; endpoint already returns pending invitations

**POST /api/teams/[teamId]/members/accept** (New or re-use existing flow)
- Request body: `{ invitationId: string }`
- Returns `{ success: true, teamId: string, role: 'member' | 'admin' }`
- Status: 201
- Errors:
  - 400: Invitation expired or already accepted
  - 403: User not authenticated for this invitation
  - 404: Invitation not found

**DELETE /api/teams/[teamId]/members/[invitationId]** (Already exists from Story 2.4)
- Used to decline invitations
- Returns `{ success: true }`
- Status: 200

### Frontend Components

**Update `app/(dashboard)/teams/page.tsx`**
- Fetch pending invitations for the current user's email (via `GET /api/teams` which now returns both active teams and pending invitations)
- Render two sections: "Pending Invitations" (optional, only if count > 0) and "Your Teams"
- Pass pending invitations to a new component

**New component: `components/pending-invitations.tsx`** (Client Component)
- Props:
  - `invitations: PendingInvitation[]` — array of pending invitations
  - `onUpdate: () => void` — callback to refresh the page state after accept/decline
- Renders a list of invitation cards in a grid matching the active teams layout
- Each card shows team name, expiry hint, and Accept/Decline buttons
- Handles async accept/decline requests with loading states
- Shows error messages if requests fail

**Update `components/team-switcher.tsx`** or create `components/teams-nav-indicator.tsx`** (Client Component)
- Shows a badge/indicator if pending invitations exist
- Count or visual indicator (red dot) visible in the header next to Teams link
- Must fetch the count of pending invitations dynamically (via API or passed from parent)

**Update `app/(dashboard)/layout.tsx`**
- Fetch pending invitations count to show on the navigation indicator
- Pass to teams nav indicator component

### TypeScript Types

Update `lib/types.ts`:
```typescript
export interface PendingInvitation {
  id: string
  teamId: string
  email: string
  role: 'member' | 'admin'
  status: 'pending' | 'accepted'
  invitedBy: string
  createdAt: number // Unix ms
  expiresAt: number | null
  acceptedAt: number | null
}

// For API responses
export interface AcceptInvitationRequest {
  invitationId: string
}

export interface AcceptInvitationResponse {
  success: boolean
  teamId: string
  role: 'member' | 'admin'
}
```

### Database & Auth

No schema changes needed; `teamInvitations` table already exists from Story 2.4.

Ensure `lib/auth.ts` and the dashboard layout call `findAndAcceptInvitations()` early so invitations are auto-accepted before rendering the page.

### Testing Requirements

**Unit tests** (optional for UI flow):
- Test `PendingInvitations` component accepts/declines correctly
- Mock API responses for success and error cases
- Verify error messages display correctly

**Integration tests** (if time permits):
- Test full flow: user with pending invitation navigates to `/teams`, sees invitation, clicks Accept, invitation moves to active teams, indicator updates

---

## Files to Create/Modify

| File | Change | Purpose |
|------|--------|---------|
| `components/pending-invitations.tsx` | Create | New component rendering pending invitation cards |
| `components/teams-nav-indicator.tsx` | Create (or integrate into existing) | Badge/indicator on Teams nav link |
| `app/(dashboard)/teams/page.tsx` | Update | Load pending invitations and render both sections |
| `app/(dashboard)/layout.tsx` | Update | Fetch pending count for nav indicator; call invitation hydration |
| `lib/types.ts` | Update | Add `AcceptInvitationRequest`, `AcceptInvitationResponse` types |
| `lib/__tests__/teams.test.ts` | Update | Add tests for pending invitations flow (optional) |
| `app/api/teams/[teamId]/members/accept/route.ts` | Create (optional) | API endpoint to accept invitation (or re-use existing POST /api/teams/[teamId]/members) |

---

## Design System & UI Patterns

### Styling Reference

- **Invitation Card:** Use same `rounded-lg border border-zinc-200 dark:border-zinc-800` as active team cards, but with background `bg-zinc-50 dark:bg-zinc-900/40` for subtle distinction
- **Button Styles:**
  - Accept: `bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900` (solid, primary)
  - Decline: `border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300` (outline, secondary)
- **Badge on nav:** `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300` (or similar semantic warning color)
- **Expiry text:** `text-xs text-zinc-500 dark:text-zinc-400` (muted, smaller than card title)

### Responsive Breakpoints

- **sm (640px):** Cards full-width, buttons stacked vertically within card
- **md (768px):** Cards in grid, buttons flex horizontally if space allows
- **lg (1024px+):** Same as md, side-by-side layout with active teams

---

## Architecture Compliance

✅ **Team Scoping:** All queries filter by authenticated user's `teamId`s; no cross-team data leakage  
✅ **Auth First:** Dashboard layout and API routes verify auth before querying  
✅ **Type Safety:** No `any` — types derived from Drizzle schema  
✅ **Error Handling:** Structured error responses with codes (`INVALID_INVITE`, `NOT_FOUND`, `FORBIDDEN`)  
✅ **REST Conventions:** POST to accept, DELETE to decline, GET to list  
✅ **Component Size:** Individual components stay under 200 lines  
✅ **Async Lifecycle:** Invitation hydration happens on first dashboard load; no blocking on page transitions

---

## Previous Story Intelligence (Story 2.4)

**From Story 2.4 — Email-Based Team Invitations:**
- Backend invitation system already complete: `teamInvitations` table, `findAndAcceptInvitations()` helper, POST/DELETE routes
- `lib/invitations.ts` contains helpers: `normalizeEmail()`, `isValidEmail()`, `invitationExpiresAt()`, `findAndAcceptInvitations()`
- API routes already tested and scoped correctly
- This story **only** builds the UI; no backend changes needed

**Learnings to apply:**
- Reuse existing `findAndAcceptInvitations()` for auto-join on page load
- Leverage existing API routes (`GET /api/teams`, `DELETE /api/teams/[teamId]/members/[invitationId]`)
- Follow existing button styles and card layouts from active team list
- Keep acceptance flow simple: one click per invitation

---

## Completion Criteria Checklist

- [ ] Pending invitations fetch and display on `/teams` page
- [ ] Accept button moves invitation to active teams list
- [ ] Decline button removes invitation from list
- [ ] Both actions show success/error feedback
- [ ] Navigation indicator shows count or badge when pending > 0
- [ ] Responsive layout works on mobile, tablet, desktop
- [ ] TypeScript strict mode compliance
- [ ] Tests added for pending invitations flow
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` all pass

---
