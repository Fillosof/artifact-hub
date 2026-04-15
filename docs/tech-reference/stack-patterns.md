# Stack Patterns Reference — Artifact Hub

> Pre-fetched from Context7 on 2026-04-15. Next.js 16.x, Clerk, Drizzle + Turso (libsql), Vitest.
> Read this file first. Only call Context7 MCP when a topic is NOT covered here.

---

## Next.js 16 — App Router

### File conventions
- `app/layout.tsx` — root layout (wraps all pages)
- `app/page.tsx` — index route
- `app/[segment]/page.tsx` — dynamic page
- `app/api/[...route]/route.ts` — route handler (replaces `pages/api/`)
- `middleware.ts` — at project root, runs on every request

### Route Handlers (`app/api/**/route.ts`)
```ts
// Basic GET
export async function GET(request: Request) {}
export async function POST(request: Request) {}

// Dynamic segment — params is a Promise in Next.js 16
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
}

// Force dynamic (no caching)
export const dynamic = 'force-dynamic'

// Force static (cached)
export const dynamic = 'force-static'
```

**Conflict rule**: `route.ts` and `page.tsx` cannot exist in the same directory.

### Server Components (default)
```tsx
// app/dashboard/page.tsx — Server Component, no "use client"
async function getData() {
  const res = await fetch('https://...', { cache: 'no-store' })
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{data.name}</div>
}
```

### Client Components
```tsx
'use client'
// Add only when you need browser APIs, useState, useEffect, event handlers
```

### Data fetching patterns
```ts
fetch('https://...', { cache: 'no-store' })          // dynamic — reruns every request
fetch('https://...', { cache: 'force-cache' })        // static — cached until invalidated
fetch('https://...', { next: { revalidate: 60 } })   // ISR — revalidate every 60s
```

### Navigation
```tsx
import Link from 'next/link'
<Link href="/dashboard">Dashboard</Link>
```

---

## Clerk — Auth (Next.js App Router)

### Root layout setup (`app/layout.tsx`)
```tsx
import { ClerkProvider, Show, SignInButton, UserButton } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header>
            <Show when="signed-out"><SignInButton /></Show>
            <Show when="signed-in"><UserButton /></Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
```

### Middleware (`middleware.ts`)
```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api/private(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Server-side auth in route handlers / server components
```ts
import { auth, currentUser } from '@clerk/nextjs/server'

// In a Route Handler
export async function GET() {
  const { userId, isAuthenticated } = await auth()
  if (!isAuthenticated) return new Response('Unauthorized', { status: 401 })
  // ...
}

// In a Server Component
export default async function Page() {
  const { userId } = await auth()
  const user = await currentUser()
  return <p>{user?.firstName}</p>
}
```

### Role / permission checks
```ts
await auth.protect((has) =>
  has({ permission: 'org:admin:access' }) || has({ role: 'org:admin' })
)
```

---

## Drizzle ORM + Turso (libsql)

### DB client (`lib/db.ts` pattern)
```ts
import { drizzle } from 'drizzle-orm/libsql'

const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
})
export default db
```

### Schema definition (`lib/schema.ts` patterns)
```ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const artifacts = sqliteTable('artifacts', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  teamId: text('team_id').notNull(),
}, (t) => [index('artifacts_team_idx').on(t.teamId)])

// Infer types — use these, not hand-rolled interfaces
export type Artifact = typeof artifacts.$inferSelect
export type NewArtifact = typeof artifacts.$inferInsert
```

### Query patterns
```ts
import { eq, and, desc } from 'drizzle-orm'

// Select
const rows = await db.select().from(artifacts).where(eq(artifacts.teamId, teamId))

// Insert
const [row] = await db.insert(artifacts).values({ title: '...' }).returning()

// Update
await db.update(artifacts).set({ title: 'new' }).where(eq(artifacts.id, id))

// Delete
await db.delete(artifacts).where(and(eq(artifacts.id, id), eq(artifacts.teamId, teamId)))

// Batch (libsql — single round-trip)
const [r1, r2] = await db.batch([
  db.insert(artifacts).values({ ... }).returning(),
  db.select().from(artifacts).where(eq(artifacts.teamId, teamId)),
])
```

---

## Vitest — Testing

### Config note
- Environment: `node` (not jsdom)
- Alias: `@/` maps to workspace root
- Test locations: `lib/__tests__/*.test.ts` or co-located `__tests__/`

### Standard test structure
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('myFunction', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns expected value on happy path', async () => {
    // arrange
    // act
    // assert
    expect(result).toBe(expected)
  })

  it('handles edge case', async () => {
    await expect(fn()).rejects.toThrow('message')
  })
})
```

### Mocking DB
```ts
import { vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: '1', title: 'Test' }]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '1' }]),
      }),
    }),
  },
}))
```

### Mocking Clerk auth
```ts
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'user_test123', isAuthenticated: true }),
}))
```

---

## When to call Context7 MCP anyway

Call `mcp_io_github_ups_get-library-docs` only when:
- You need a topic **not listed above** (e.g., Next.js Image optimisation, Clerk webhooks, Drizzle migrations CLI)
- Something behaves unexpectedly and you suspect the docs above are outdated
- A new library is being added to the project

After fetching, **add a new section to this file** so the next run doesn't need to call MCP.
