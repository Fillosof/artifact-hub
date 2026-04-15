---
applyTo: "**/__tests__/**/*.test.ts,**/*.test.ts"
description: "Test-specific Copilot instructions for Artifact Hub"
---

# Test Instructions — Artifact Hub

## Framework & Config

- **Vitest v4** is the only test framework. Do not introduce Jest, Mocha, or any other runner.
- Config: `vitest.config.ts` — `environment: 'node'`, includes `**/__tests__/**/*.test.ts` and `**/*.test.ts`.
- `@/` alias resolves to the workspace root (same as app code) — configured in `vitest.config.ts` via `resolve.alias`.
- Run tests: `npm run test` (single run) or `npm run test:watch` (watch mode).

## Test File Locations

- `lib/__tests__/*.test.ts` — preferred location for `lib/` module unit tests.
- Co-located `__tests__/*.test.ts` — for route handlers or feature modules when proximity helps.
- Do **not** put test files inside `app/` pages — those are Next.js Server Components, not direct test targets.

## When to Write Tests

| Change type | Test required |
|---|---|
| New `lib/` function | ✅ Unit test — happy path + at least one edge case |
| New `app/api/` route handler | ✅ Integration test — mock DB + auth |
| New or modified schema table/column | ✅ `assertType` test in `lib/__tests__/schema.test.ts` |
| Bug fix | ✅ Regression test that would have caught the bug |
| UI-only Server Component (no business logic) | Optional |
| Config or env changes | No test needed |

## Schema Type Tests (established pattern)

See `lib/__tests__/schema.test.ts` for the canonical example. Use Vitest's `assertType` for compile-time shape assertions:

```typescript
import { describe, it, expect, assertType } from 'vitest'
import { artifacts } from '@/lib/schema'

describe('artifacts schema', () => {
  it('enrichmentStatus is narrowed to the correct union', () => {
    type Status = typeof artifacts.$inferSelect['enrichmentStatus']
    assertType<'pending' | 'complete' | 'failed'>('pending' as Status)
  })

  it('id is typed as string (not number)', () => {
    type Id = typeof artifacts.$inferSelect['id']
    assertType<string>('' as Id)
  })
})
```

## Unit Test Example — `lib/` Function

```typescript
import { describe, it, expect } from 'vitest'
import { normalizeTag } from '@/lib/utils'

describe('normalizeTag', () => {
  it('lowercases and trims input', () => {
    expect(normalizeTag('  React  ')).toBe('react')
  })

  it('rejects empty string after trim', () => {
    expect(() => normalizeTag('   ')).toThrow()
  })
})
```

## API Route Integration Test Example

Mock the DB and auth at module boundaries — no real Turso calls in tests:

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}))

vi.mock('@/lib/auth', () => ({
  resolveAuth: vi.fn().mockResolvedValue({ userId: 'user_1', teamIds: ['team_1'] }),
}))

describe('GET /api/artifacts', () => {
  it('returns 401 when auth throws', async () => {
    const { resolveAuth } = await import('@/lib/auth')
    vi.mocked(resolveAuth).mockRejectedValueOnce(new Error('Unauthorized'))
    // import your handler and call it with a Request object
  })

  it('returns only artifacts belonging to the users team', async () => {
    // assert the where clause includes teamId
  })
})
```

## Common Pitfalls

- **Don't** call `db` directly in tests — mock `@/lib/db` at the module level with `vi.mock`.
- **Don't** call Clerk or Anthropic APIs in tests — mock `@/lib/auth` and `@/lib/enrichment`.
- **Don't** use `any` in test assertions — use typed mocks (`vi.mocked(fn)`).
- **Don't** delete or weaken existing tests to make the suite green — fix the failing code instead.
- **Don't** test Drizzle, Clerk, or Anthropic SDK internals — test your own logic only.
- **Do** test every branch: auth failure, not-found, wrong team, validation error, success.
