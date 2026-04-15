# Story 1.3: Clerk Authentication & Route Protection

Status: complete

## Story

As an unauthenticated user,
I want to be redirected to sign-in when I try to access any protected route,
So that all artifacts and team data are protected behind authentication.

## Acceptance Criteria

1. **Given** `middleware.ts` at the root **When** an unauthenticated request hits any route other than `/sign-in`, `/sign-up`, or public API routes **Then** the middleware redirects to the Clerk sign-in page.

2. **Given** `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` **When** an unauthenticated user visits these pages **Then** the Clerk-provided sign-in and sign-up components render correctly.

3. **Given** a user who completes Clerk signup **When** they are authenticated **Then** they are redirected to `/gallery` and can access authenticated routes.

4. **Given** a valid Clerk session cookie **When** a request reaches any protected page or API route **Then** the request proceeds without redirect.

5. **Given** `app/(dashboard)/layout.tsx` **When** rendered for an authenticated user **Then** it renders a navigation header with the user's avatar/name and a sign-out option.

## Tasks / Subtasks

- [x] Task 1: Replace `middleware.ts` stub with actual Clerk middleware (AC: #1, #4)
  - [x] Import `clerkMiddleware` and `createRouteMatcher` from `@clerk/nextjs/server`
  - [x] Define public routes: `/sign-in(.*)` and `/sign-up(.*)`
  - [x] Call `auth.protect()` for all non-public routes
  - [x] Update the `config.matcher` to include both Next.js internals exclusion and `/(api|trpc)(.*)`
  - [x] Verify the dev server still starts cleanly

- [x] Task 2: Wrap root layout with `ClerkProvider` (AC: #2, #3)
  - [x] Import `ClerkProvider` from `@clerk/nextjs`
  - [x] Wrap the `<html>` tag in `<ClerkProvider>` with appropriately updated props (`signInFallbackRedirectUrl`, `signUpFallbackRedirectUrl`, `afterSignOutUrl`) for Core 3
  - [x] Keep existing `Geist` font set-up and `globals.css` import unchanged
  - [x] Update `metadata.title` to "Artifact Hub" and `metadata.description` to "Internal AI artifact platform"

- [x] Task 3: Implement `app/sign-in/[[...sign-in]]/page.tsx` (AC: #2)
  - [x] Import `SignIn` from `@clerk/nextjs`
  - [x] Render `<SignIn />` centered on page using a flex container
  - [x] Replace the placeholder export entirely

- [x] Task 4: Implement `app/sign-up/[[...sign-up]]/page.tsx` (AC: #2)
  - [x] Import `SignUp` from `@clerk/nextjs`
  - [x] Render `<SignUp />` centered on page using a flex container
  - [x] Replace the placeholder export entirely

- [x] Task 5: Create `app/(dashboard)/layout.tsx` — dashboard nav layout (AC: #5)
  - [x] Create the `app/(dashboard)/` directory
  - [x] Create `components/user-nav.tsx` as a `'use client'` component that renders `<UserButton>` from `@clerk/nextjs`
  - [x] Create `app/(dashboard)/layout.tsx` as a server component that imports `UserNav` and renders a `<header>` with the Artifact Hub brand name (linking to `/gallery`) and the `<UserNav />` on the right
  - [x] The layout should export a default async function that accepts `{ children: React.ReactNode }` and renders `<header>` + `<main>` wrapping children

- [x] Task 6: Create `app/(dashboard)/gallery/page.tsx` — minimal placeholder for redirect target (AC: #3)
  - [x] Create a minimal server component that renders an `<h1>Gallery</h1>` placeholder
  - [x] This page will be fully implemented in Story 4.1; the placeholder is required so the post-auth redirect to `/gallery` resolves without a 404

- [x] Task 7: Verify route protection end-to-end (AC: #1, #4)
  - [x] Run `npm run dev`
  - [x] Visit `http://localhost:3000` without auth — confirm redirect to `/sign-in`
  - [x] Visit `http://localhost:3000/gallery` without auth — confirm redirect to `/sign-in`
  - [x] Sign in via Clerk — confirm redirect to `/gallery` and the nav header renders

- [x] Task 8: Write unit tests (AC: all)
  - [x] Create `lib/__tests__/middleware-routes.test.ts`
  - [x] Test that public routes (`/sign-in`, `/sign-up`) match the public route pattern
  - [x] Test that protected routes (`/gallery`, `/`, `/teams`) do NOT match the public route pattern
  - [x] Use `createRouteMatcher` from `@clerk/nextjs/server` directly in the test — do NOT mock Clerk internals
  - [x] Run `npm run build` to confirm TypeScript compiles without errors
  - [x] Run `npm test` — all tests must pass

## Dev Notes

### CRITICAL: Clerk 7.x (Core 3) API — Do Not Use Older Examples

Clerk **7.1.0** (`@clerk/nextjs`) is installed. This uses the **Core 3** API. The older `authMiddleware()` from Clerk v4/v5 is **NOT available**. Do not copy any Clerk examples predating March 2026 or from the Clerk v5 docs.

**Correct imports:**
```typescript
// middleware
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// server components
import { currentUser } from '@clerk/nextjs/server'
import { auth } from '@clerk/nextjs/server'

// provider + embedded UI components (for client/shared files)
import { ClerkProvider, SignIn, SignUp, UserButton } from '@clerk/nextjs'
```

> [Source: docs/implementation-artifacts/1-1-project-initialization-dependency-installation.md#Verified Package Versions]

### middleware.ts — Exact Replacement

Replace the pass-through stub entirely. The new middleware must:
1. Use `clerkMiddleware()` as the **default export**
2. Use `createRouteMatcher` to define public routes
3. Protect all non-public routes with `auth.protect()`

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jld(?!on)|bmp|tiff?|gif|png|jpe?g|svg|ttf|ico|cur|heic|webp|avif)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
```

**Why `auth.protect()` and not manual redirect:** `auth.protect()` in Clerk 7 Core 3 correctly handles redirect to the configured sign-in URL, including the `redirect_url` parameter so users return to their originally requested page after sign-in.

> [Source: docs/planning-artifacts/architecture.md#Authentication & Security]

### app/layout.tsx — ClerkProvider Placement

`ClerkProvider` wraps the **entire** application at the root layout level. This ensures Clerk context is available on sign-in and sign-up pages as well as dashboard pages — avoiding any "missing Clerk context" runtime errors.

```tsx
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Artifact Hub',
  description: 'Internal AI artifact platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignInUrl="/gallery" afterSignUpUrl="/gallery">
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

**Note:** `afterSignInUrl` and `afterSignUpUrl` are `ClerkProvider` props that control the post-auth redirect globally. The Clerk `<SignIn />` and `<SignUp />` components inherit these. No additional env vars (`CLERK_SIGN_IN_FORCE_REDIRECT_URL`) are required.

> [Source: docs/planning-artifacts/architecture.md#Frontend Architecture — Server Components by default]

### Sign-In and Sign-Up Pages

Both pages are simple wrappers around Clerk's embedded components. They center the component on the screen.

```tsx
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
```

```tsx
// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  )
}
```

The `[[...sign-in]]` and `[[...sign-up]]` catch-all segments are required by Clerk to support its multi-step embedded UI flows (e.g. OAuth callbacks, verification steps). Do not change the directory names.

> [Source: docs/planning-artifacts/epics.md#Story 1.3]

### Dashboard Layout & UserNav Component

**File: `components/user-nav.tsx`** (client component — `UserButton` needs browser context)
```tsx
'use client'

import { UserButton } from '@clerk/nextjs'

export function UserNav() {
  return <UserButton afterSignOutUrl="/sign-in" />
}
```

**File: `app/(dashboard)/layout.tsx`** (server component by default)
```tsx
import Link from 'next/link'
import { UserNav } from '@/components/user-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <Link href="/gallery" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Artifact Hub
          </Link>
          <UserNav />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  )
}
```

**Why `UserButton` is in a separate `'use client'` file:** The dashboard layout is a server component (Next.js App Router default). `UserButton` is an interactive client component. Isolating it keeps the layout server-rendered while allowing the interactive sign-out button. This pattern follows the architecture rule: "Server Components by default; `use client` only for interactive elements."

> [Source: docs/planning-artifacts/architecture.md#Frontend Architecture]

### Gallery Placeholder Page

Create `app/(dashboard)/gallery/page.tsx` as a minimal placeholder:

```tsx
export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Gallery</h1>
      <p className="mt-2 text-zinc-500">Artifact gallery — implemented in Story 4.1.</p>
    </div>
  )
}
```

This is strictly a placeholder. Story 4.1 replaces it with the full gallery implementation. Its only purpose in this story is to provide a valid landing page for the post-auth redirect to `/gallery`.

### Route Group: `(dashboard)`

The `(dashboard)` directory name uses parentheses (a Next.js App Router **route group**). This means the group name does NOT appear in the URL. So `app/(dashboard)/gallery/page.tsx` maps to the URL `/gallery`, and `app/(dashboard)/layout.tsx` applies to all pages within without prefixing the URL.

All authenticated pages (gallery, teams, settings, artifact detail) will live under `app/(dashboard)/`.

> [Source: docs/planning-artifacts/architecture.md#Code Structure — Folder organization]

### `lib/auth.ts` Is NOT Modified in This Story

`lib/auth.ts` (the `resolveAuth()` helper) is the dual-auth helper for API routes (Clerk session + API key). That is implemented in **Story 1.4**. Do not touch `lib/auth.ts` in this story.

### Environment Variables

All Clerk env vars are already stubbed in `.env.local` and `.env.example` from Story 1.1. Fill in actual values from the Clerk dashboard:
- `CLERK_SECRET_KEY` — from Clerk dashboard → API Keys
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — from Clerk dashboard → API Keys

No new env vars are required for this story. Redirect configuration is handled via `ClerkProvider` props.

### Testing — Route Matcher Unit Test

Since `clerkMiddleware` is hard to test in isolation (requires full Next.js request context), test the underlying `createRouteMatcher` logic directly to validate that the public route list is correct:

```typescript
// lib/__tests__/middleware-routes.test.ts
import { describe, it, expect } from 'vitest'
import { createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

// createRouteMatcher requires a request-like object with nextUrl.pathname
function fakeRequest(pathname: string) {
  return { nextUrl: { pathname } } as Parameters<typeof isPublicRoute>[0]
}

describe('middleware public route matcher', () => {
  it('matches /sign-in as public', () => {
    expect(isPublicRoute(fakeRequest('/sign-in'))).toBe(true)
  })

  it('matches /sign-in sub-paths as public', () => {
    expect(isPublicRoute(fakeRequest('/sign-in/sso-callback'))).toBe(true)
  })

  it('matches /sign-up as public', () => {
    expect(isPublicRoute(fakeRequest('/sign-up'))).toBe(true)
  })

  it('does NOT match /gallery as public', () => {
    expect(isPublicRoute(fakeRequest('/gallery'))).toBe(false)
  })

  it('does NOT match / (root) as public', () => {
    expect(isPublicRoute(fakeRequest('/'))).toBe(false)
  })

  it('does NOT match /api/teams as public', () => {
    expect(isPublicRoute(fakeRequest('/api/teams'))).toBe(false)
  })
})
```

**Note:** The `fakeRequest` cast may require an `as unknown as Parameters<typeof isPublicRoute>[0]` cast if TypeScript complains about the shape. Check the Clerk type definition at `node_modules/@clerk/nextjs/dist/types/server/` if needed.

> [Source: docs/planning-artifacts/architecture.md#Testing Standards]

### Project Structure After This Story

```
├── app/
│   ├── globals.css
│   ├── layout.tsx                         ← MODIFIED: ClerkProvider added
│   ├── page.tsx                           ← unchanged (replaced in Epic 4)
│   ├── (dashboard)/
│   │   ├── layout.tsx                     ← NEW: Nav header layout
│   │   └── gallery/
│   │       └── page.tsx                   ← NEW: Placeholder gallery page
│   ├── sign-in/[[...sign-in]]/
│   │   └── page.tsx                       ← MODIFIED: Real SignIn component
│   └── sign-up/[[...sign-up]]/
│       └── page.tsx                       ← MODIFIED: Real SignUp component
├── components/
│   ├── ui/                                ← unchanged (shadcn base components)
│   └── user-nav.tsx                       ← NEW: UserButton client component
├── lib/
│   ├── auth.ts                            ← unchanged (Story 1.4)
│   └── ...                               ← unchanged
├── middleware.ts                           ← MODIFIED: clerkMiddleware active
```

### Previous Story Learnings (from Story 1.2)

- `nanoid` v5 is installed (`^5.1.7`) — uses `import { nanoid } from 'nanoid'` with standard ESM.
- All `lib/__tests__/*.test.ts` tests run under **Vitest** via `npm test`.
- `npm run build` is the definitive TypeScript check — run before marking done.
- The Turso database schema is fully applied in production; `lib/schema.ts` and `lib/db.ts` are stable.

### Potential Gotchas

| Gotcha | Prevention |
|--------|------------|
| Using `authMiddleware` instead of `clerkMiddleware` | `authMiddleware` is Clerk v4 — it does not exist in v7. Always import from `@clerk/nextjs/server`. |
| `ClerkProvider` placed inside `app/(dashboard)/layout.tsx` only | Must be in root `app/layout.tsx` — sign-in/sign-up pages also need Clerk context for the embedded components. |
| Forgetting `[[...sign-in]]` catch-all brackets | Single segment `[sign-in]` breaks Clerk's multi-step OAuth flows. Must be `[[...sign-in]]`. |
| `UserButton` in a server component | `UserButton` is a client component. Wrap in a `'use client'` file (`user-nav.tsx`). Importing it directly in a server layout causes a build error. |
| `auth()` called without `await` in server component | In Clerk 7 (Core 3), `auth()` from `@clerk/nextjs/server` is **async** — always `await auth()`. |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
