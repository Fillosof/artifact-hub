---
storyKey: 2-4-email-based-team-invitations
storyId: '2.4'
epic: 2
title: Email-Based Team Invitations (Pending Invitations Model)
type: 'enhancement'
status: 'ready-for-dev'
priority: 'high'
relatedTo: ['2-2-team-membership-management']
requiredByFrontend:
  - Updated TeamMembers component for email input
  - New invitation modal/form with email field
  - Auto-join on sign-up flow
createdAt: '2026-04-15'
updatedAt: '2026-04-15'
effort: 'medium'
---

# Story 2.4: Email-Based Team Invitations (Pending Invitations Model)

## Overview

Replace the current Clerk ID-based team member invitation system with a **Pending Invitations Model** that accepts email addresses. This improves UX dramatically—admins can invite people they know by email without needing to collect Clerk IDs. When invited users sign up or sign in, they're automatically added to their invited teams.

This is a **UX enhancement to Story 2.2**. Story 2.2 currently requires admins to know and provide individual Clerk user IDs. This story flips the model to email-based invites, which is more intuitive and practical.

## User Story

**As a team admin,**  
**I want to invite team members by email address,**  
**So that I can easily invite people without needing their Clerk ID.**

---

## Acceptance Criteria

### Database Changes

**Given** the schema is updated  
**When** I inspect `lib/schema.ts`  
**Then** I see a new `teamInvitations` table with columns:
- `id` (nanoid, PK)
- `teamId` (FK to teams, cascade delete)
- `email` (lowercase, normalized)
- `role` ("member" or "admin", defaults to "member")
- `status` ("pending" or "accepted", defaults to "pending")
- `invitedBy` (Clerk userId who sent the invite)
- `createdAt` (timestamp_ms)
- `expiresAt` (timestamp_ms, nullable; recommendations: 30 days from invite, but MVP can accept null for no expiry)
- `acceptedAt` (timestamp_ms, nullable)
- `indices`: unique on `(teamId, email, status='pending')` to prevent duplicate pending invites; index on `email` for fast acceptance lookup

**Given** the `teamInvitations` table is created  
**When** I run `npx drizzle-kit push`  
**Then** the table is added to Turso and all subsequent queries work without migration errors

### Invitation Creation Flow

**Given** `POST /api/teams/[teamId]/members` endpoint (update from Story 2.2)  
**When** called by a team admin with `{ email: "user@example.com", role: "member" }`  
**Then** the route:
1. Verifies the caller is an admin of `teamId`
2. Normalizes the email (lowercase, trim)
3. Validates the email format (not empty, contains `@`)
4. Checks if an active team membership already exists for this email + teamId (return error if so)
5. Checks if a pending invitation already exists for this email + teamId (return error if so)
6. Inserts a new row in `teamInvitations` with status "pending" and `expiresAt` set to 30 days from now
7. Returns `{ id, teamId, email, role, status, createdAt, expiresAt }` with HTTP 201

**Given** an invitation is created  
**When** I check the response  
**Then** no Clerk lookup is performed; the invite is entirely email-based and stored immediately

**Given** someone attempts to invite an email that already has a pending invite  
**When** they submit the form  
**Then** they receive `{ error: "This email already has a pending invitation", code: "INVALID_INVITE" }` with HTTP 400

**Given** someone attempts to invite an email that is already a team member  
**When** they submit the form  
**Then** they receive `{ error: "This email is already a member of this team", code: "CONFLICT" }` with HTTP 409

### Sign-Up Auto-Join Flow

**Given** a user signs up via Clerk with email `user@example.com`  
**When** the Clerk webhook or sign-up completion handler fires  
**Then** the app queries `teamInvitations` for all pending invites matching `user@example.com`  
**Then** for each matching invite:
1. Verify it hasn't expired (if `expiresAt` is set and is in the past, skip it)
2. Create a `team_memberships` row with the user's Clerk ID, the team ID, and the role from the invite
3. Update the invitation's `status` to "accepted" and set `acceptedAt` to now
4. The user is now a member of the team without manual acceptance

**Given** a user signs in (existing Clerk user)  
**When** they complete session establishment  
**Then** the same logic applies: check for pending invites by email and auto-join if any exist

**Note:** This requires integration with Clerk's webhook or post-sign-up hook. For MVP simplicity, an alternative is to check pending invites on the first `GET /api/teams` call after sign-in, with a one-time hydration pattern.

### Team Member List & Management (Updated from Story 2.2)

**Given** `GET /api/teams/[teamId]/members`  
**When** called by an admin  
**Then** it returns both:
- Active members from `team_memberships` with their `displayName` or default to Clerk ID
- Pending invitations from `teamInvitations` with status "pending", showing email and invited-by info

**Given** the TeamMembers component renders  
**When** the members and pending invites are loaded  
**Then** the UI displays two sections:
1. **Active Members** (list with role, change role, remove buttons)
2. **Pending Invitations** (email, role, "Cancel Invite" button, expiry time)

**Given** an admin clicks "Cancel Invite" on a pending invitation  
**When** `DELETE /api/teams/[teamId]/members/[invitationId]` executes  
**Then** the invitation row is deleted; if the email later signs up, they won't auto-join anymore

### UI Component Updates

**Given** `components/team-members.tsx`  
**When** I inspect the code  
**Then** it:
1. Renders an input field with label "Invite by Email" instead of "Add by Clerk ID"
2. Has validation: reject if email is empty or doesn't contain `@`
3. Sends payload `{ email, role }` instead of `{ userId, role }` to the API
4. Displays pending invitations as a separate section below active members
5. Each pending invite shows: email, role bagde, expiry time, "Cancel Invite" button
6. Handles errors: duplicate email, already a member, invitation failed, etc.
7. Auto-focuses the email field after an invite is added (same UX as user ID)

**Given** `app/(dashboard)/teams/[teamId]/page.tsx`  
**When** the page renders for an admin  
**Then** it loads both active members and pending invitations, passing both to the TeamMembers component

### Edge Cases & Error Handling

**Given** an email that is invited, then the person signs up with different email  
**When** they sign in later with the original email  
**Then** they are auto-joined to the team

**Given** a pending invitation expires (30 days old)  
**When** the invited user signs up with that email  
**Then** the invitation is found but skipped (expired); the user is NOT auto-joined; they must be re-invited

**Given** an admin invites the same email twice while one is pending  
**When** they try to send the second invite  
**Then** the API returns `INVALID_INVITE` (duplicate pending)

**Given** an admin removes a user from a team, then re-invites their email  
**When** a new pending invitation is created  
**Then** it's a separate row; the user will auto-join again on next sign-in

**Given** a user receives multiple invitations to different teams  
**When** they sign up or sign in  
**Then** they are auto-joined to ALL teams with pending, non-expired invitations for their email

**Given** an API call from MCP or web with invalid email format  
**When** the request reaches the endpoint  
**Then** the server returns `{ error: "Invalid email format", code: "VALIDATION_ERROR" }` with HTTP 400

---

## Technical Requirements

### Database Schema Update

```typescript
// Add to lib/schema.ts

export const teamInvitations = sqliteTable('team_invitations', {
  id:        text('id').primaryKey(),                        // nanoid
  teamId:    text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  email:     text('email').notNull(),                        // lowercase, normalized
  role:      text('role', { enum: ['member', 'admin'] }).notNull().default('member'),
  status:    text('status', { enum: ['pending', 'accepted'] }).notNull().default('pending'),
  invitedBy: text('invited_by').notNull(),                   // Clerk userId
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),  // nullable; 30 days recommended
  acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }), // null until accepted
}, (t) => ({
  uniqPendingInvite: uniqueIndex('idx_team_invitations_pending').on(t.teamId, t.email).where(eq(t.status, 'pending')),
  idxEmail:         index('idx_team_invitations_email').on(t.email),
  idxTeamId:        index('idx_team_invitations_team_id').on(t.teamId),
}))
```

### API Changes

**Update** `POST /api/teams/[teamId]/members` to accept both:
- Old format (Story 2.2 compat): `{ userId, role }` → add user directly if they exist in Clerk
- New format: `{ email, role }` → create pending invitation

**Add** `DELETE /api/teams/[teamId]/members/[invitationId]` to cancel pending invitations

**Add helper function** `findAndAcceptInvitations(email: string, userId: string)` that:
- Queries `SELECT * FROM team_invitations WHERE email = ? AND status = 'pending' AND (expiresAt IS NULL OR expiresAt > now())`
- For each match, creates a `team_memberships` row and updates invitation status to "accepted"

### Integration Points

1. **Clerk Post-Sign-Up Hook:** Call `findAndAcceptInvitations(user.email, user.id)` after successful sign-up
2. **First-Request Hydration (Alternative):** Check for pending invites on the first authenticated request to `/api/teams` or `/gallery`, with a one-time flag to avoid repeated checks
3. **Team Members Fetch:** Update `GET /api/teams/[teamId]/members` to return both active members AND pending invitations

### TypeScript Types

Update `lib/types.ts` to include:

```typescript
export type TeamInvitation = typeof teamInvitations.$inferSelect
export type TeamInvitationInsert = typeof teamInvitations.$inferInsert

export interface TeamMember {
  id: string
  userId: string
  role: 'member' | 'admin'
  joinedAt: number
  displayName?: string
}

export interface PendingInvitation {
  id: string
  teamId: string
  email: string
  role: 'member' | 'admin'
  status: 'pending' | 'accepted'
  invitedBy: string
  createdAt: number
  expiresAt: number | null
  acceptedAt: number | null
}
```

---

## Architecture Compliance

✅ **Schema-First Drizzle:** New table follows existing conventions (nanoid PKs, timestamp_ms, proper indexes)  
✅ **Team Scoping:** All invitation queries filtered by `teamId`; no cross-team leakage  
✅ **Admin-Only Operations:** Invite/cancel endpoints verify caller is team admin  
✅ **Structured Errors:** Returns standardized error codes (`VALIDATION_ERROR`, `INVALID_INVITE`, `CONFLICT`, `FORBIDDEN`)  
✅ **No Raw Authentication Lookups:** Invitations use email, not Clerk IDs; no external API calls needed  
✅ **Typed Responses:** All API responses typed with inferred types from schema  
✅ **REST Conventions:** POST to create, DELETE to cancel, GET to list  

---

## Files to Create/Modify

| File | Change | Purpose |
|------|--------|---------|
| `lib/schema.ts` | Add `teamInvitations` table | Database schema for pending invitations |
| `lib/types.ts` | Add `TeamInvitation`, `PendingInvitation` types | Type safety for invitation data |
| `app/api/teams/[teamId]/members/route.ts` | Update POST, add DELETE handler | Create and cancel invitations |
| `lib/auth.ts` (or new `lib/invitations.ts`) | Add `findAndAcceptInvitations()` helper | Auto-join logic on sign-up/sign-in |
| `components/team-members.tsx` | Refactor to email input + display pending invites | Updated UI for email-based flow |
| `app/(dashboard)/teams/[teamId]/page.tsx` | Fetch pending invitations alongside members | Pass both to component |
| `middleware.ts` (optional) | Call `findAndAcceptInvitations` on sign-in | One-time hydration pattern |

---

## Testing

### Unit Tests (`lib/__tests__/invitations.test.ts`)

```typescript
describe('findAndAcceptInvitations', () => {
  it('should create team_memberships for all pending, non-expired invites', async () => {
    // Setup: create 2 pending invites for same email, different teams
    // Call findAndAcceptInvitations(email, userId)
    // Assert: 2 team_memberships rows created, both invites marked accepted
  })

  it('should skip expired invitations', async () => {
    // Setup: one expired, one valid pending invite
    // Call findAndAcceptInvitations(email, userId)
    // Assert: only 1 team_memberships created; expired invite unchanged
  })

  it('should skip invites with status !== pending', async () => {
    // Setup: invitation with status 'accepted'
    // Call findAndAcceptInvitations(email, userId)
    // Assert: no duplicate team_memberships created
  })
})
```

### Integration Tests (`app/api/teams/[teamId]/members/__tests__/route.test.ts`)

Update existing tests from Story 2.2:

```typescript
describe('POST /api/teams/[teamId]/members', () => {
  it('should create pending invitation when email provided', async () => {
    // POST with { email: "user@example.com", role: "member" }
    // Assert: 201, invitation row created, returns invitation object
  })

  it('should reject duplicate pending invite email', async () => {
    // POST same email twice
    // Assert: 400 INVALID_INVITE on second attempt
  })

  it('should reject if email already a team member', async () => {
    // Setup: user already in team_memberships
    // POST with their email
    // Assert: 409 CONFLICT
  })

  it('should validate email format', async () => {
    // POST with { email: "invalid", role: "member" }
    // Assert: 400 VALIDATION_ERROR
  })

  it('[Compat] should still accept userId for backward compat', async () => {
    // POST with { userId: "clerk_123", role: "member" }
    // Assert: still works (ensure no regression)
  })
})

describe('DELETE /api/teams/[teamId]/members/[invitationId]', () => {
  it('should delete pending invitation', async () => {
    // DELETE /api/teams/[teamId]/members/[invitationId]
    // Assert: 200, invitation row deleted
  })

  it('should reject non-admin', async () => {
    // DELETE as team member (not admin)
    // Assert: 403 FORBIDDEN
  })

  it('should reject if invitation not found', async () => {
    // DELETE with non-existent ID
    // Assert: 404 NOT_FOUND
  })
})
```

### Component Integration Tests

```typescript
describe('TeamMembers (email-based)', () => {
  it('should render email input field and pending invites section', () => {
    // Render with mock members + pending invites
    // Assert: email input visible, pending invites section shown
  })

  it('should submit email invitation', async () => {
    // Type email, click Invite
    // Assert: fetch to POST with email payload
  })

  it('should show pending offer with cancel button', async () => {
    // Render with pending invite
    // Assert: email displayed, role badge, "Cancel Invite" button visible
  })

  it('should cancel invitation on button click', async () => {
    // Click "Cancel Invite"
    // Assert: DELETE called, invitation removed from UI
  })
})
```

---

## Deployment Notes

1. **Database Migration:** Run `npx drizzle-kit push` to add `teamInvitations` table to Turso
2. **Environment Variables:** No new env vars required; uses existing Turso connection
3. **Clerk Webhook (Optional):** If implementing post-sign-up auto-join, configure Clerk webhook to POST to `/api/internal/accept-invitations` with user email
4. **Backward Compatibility:** Keep `userId` acceptance in POST endpoint for 1 sprint to allow gradual migration

---

## Previous Story Intelligence

**From Story 2.2 (Team Membership Management):**
- API structure: `/api/teams/[teamId]/members` pattern is stable
- Error codes: `TEAM_ACCESS_DENIED`, `FORBIDDEN`, `CONFLICT` are standardized
- Admin verification helper: `requireAdmin()` in route file works well; reuse it
- Component architecture: TeamMembers component handles both display and form; extend for email input
- No breaking changes: This is an enhancement to the invite method, not a replacement of existing member management

**Learnings to apply here:**
- ✅ Use `resolveAuth()` + `requireAdmin()` pattern—don't reinvent auth
- ✅ Normalize input (email: lowercase) before storing or querying
- ✅ Return structured InvitationResponse, not raw DB rows
- ✅ Component should accept both members AND pending invitations, display separately

---

## Latest Technical Information

**Email Validation:** Use simple regex or built-in validation (no external library needed):
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

**Expiration Logic:** 30 days recommended TTL for MVP:
```typescript
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
```

**Clerk Webhooks:** Documented at [clerk.com/docs/webhooks](https://clerk.com/docs/webhooks/overview). Post-sign-up event includes user email automatically.

**Auto-Join Pattern:** Common in SaaS for invite acceptance. Keeps UX frictionless—no extra "accept" step required.

---

## Definition of Done

- [ ] Task 1: Add `teamInvitations` table to schema and run `npx drizzle-kit push`
- [ ] Task 2: Add types `TeamInvitation`, `PendingInvitation` to `lib/types.ts`
- [ ] Task 3: Implement `findAndAcceptInvitations(email, userId)` helper in `lib/auth.ts` or `lib/invitations.ts`
- [ ] Task 4: Update `POST /api/teams/[teamId]/members` to accept `{ email, role }` and create invitation
- [ ] Task 5: Implement `DELETE /api/teams/[teamId]/members/[invitationId]` to cancel invitations
- [ ] Task 6: Write unit tests for invitation helpers (mock DB, test expired/accepted cases)
- [ ] Task 7: Write integration tests for POST/DELETE endpoints with mocked `resolveAuth()`
- [ ] Task 8: Update `components/team-members.tsx` to accept email input and render pending invites section
- [ ] Task 9: Update `app/(dashboard)/teams/[teamId]/page.tsx` to fetch and pass pending invitations
- [ ] Task 10: Write component integration tests for email input, invitation display, cancel button
- [ ] Task 11: (Optional) Wire up Clerk webhook for auto-join on sign-up (or use first-request hydration pattern)
- [ ] Task 12: Run review gates: `npm run typecheck && npm run lint && npm run test && npm run build`

---

## Questions & Clarifications

**Q: Should we send email notifications?**  
A: Out of scope for MVP. Invitations are stored and auto-joined on sign-up. No email service integration needed.

**Q: What if someone never signs up?**  
A: Invitation expires after 30 days. They'd need to be re-invited. This is acceptable for internal MVP.

**Q: How do we handle email updates (user changes email in Clerk)?**  
A: MVP simplification: we don't. Email is locked at sign-up. Future enhancement if needed.

**Q: Should admins see who accepted which invitation?**  
A: Yes—pending vs. accepted status makes this clear in the UI.

**Q: Can users decline an invitation?**  
A: No—auto-join on sign-up. If they don't want to be in the team, they can leave via team settings (future story).

---

## Notes

- This story **replaces the Clerk ID requirement** from Story 2.2, making team invitations practical for real users.
- The **Pending Invitations Model** is simpler and more scalable than Clerk's org API approach.
- **No breaking changes** to existing team/member APIs; only additions.
- **Email normalization** (lowercase, trim) is critical to avoid duplicate invites for variations like `User@Example.com` vs. `user@example.com`.
- **Expiration logic** can be deferred post-MVP if needed; starting with 30-day TTL is sensible default.
