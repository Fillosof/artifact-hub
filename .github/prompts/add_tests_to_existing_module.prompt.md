---
description: "Add Vitest coverage to an existing lib/ module in Artifact Hub"

---

# Add Tests to Existing Module

## Goal

Write Vitest tests for a `lib/` module that currently has no or insufficient test coverage, without changing the module's production code.

## Inputs

- **Target module**: e.g. `lib/enrichment.ts`, `lib/auth.ts`, `lib/utils.ts`

## Steps

1. **READ** the target module in full — understand every exported function: inputs, outputs, error paths, and side effects.
2. **READ** `lib/__tests__/schema.test.ts` to understand the established test style and imports.
3. **READ** `vitest.config.ts` to confirm the `include` patterns and `@/` alias setup.
4. **PLAN** test cases before writing any code:
   - Happy path for each exported function.
   - At least one error path per function that can throw or reject.
   - Edge cases: empty input, max length, null/undefined, boundary values.
5. **MOCK** all external dependencies at module level — before any `describe` block:
   ```typescript
   import { vi } from 'vitest'

   vi.mock('@/lib/db', () => ({
     db: {
       select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
       insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
       update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
     },
   }))

   vi.mock('@/lib/auth', () => ({
     resolveAuth: vi.fn().mockResolvedValue({ userId: 'user_test', teamIds: ['team_test'] }),
   }))
   ```
6. **WRITE** tests in `lib/__tests__/<module-name>.test.ts`.
7. **RUN**:
   ```bash
   npm run test
   npm run typecheck
   ```
8. **REPORT** — list all test cases added and confirm they pass.

## Checks

- [ ] Tests cover happy path for every exported function
- [ ] Tests cover at least one error path per function that can throw or reject
- [ ] No real network, DB, or Anthropic API calls (all external deps mocked)
- [ ] No `any` in test code — use `vi.mocked()` for typed mocks
- [ ] `npm run test` passes — all green
- [ ] `npm run typecheck` passes

## Example Call

> "Add tests to `lib/enrichment.ts`"

Expected output: `lib/__tests__/enrichment.test.ts` with mocked Anthropic SDK (`@anthropic-ai/sdk`) and mocked `@/lib/db`, covering: successful enrichment (sets `complete`), Claude API error (sets `failed`), DB update failure.
