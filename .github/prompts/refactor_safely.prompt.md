---
description: "Refactor existing code without breaking behaviour in Artifact Hub"
---

# Refactor Safely

## Goal

Refactor a module or component while keeping all existing tests green and all review gates passing. No behaviour changes without explicit approval.

## Inputs

- **Target**: file or module to refactor (e.g. `lib/auth.ts`, `app/api/artifacts/route.ts`)
- **Goal**: what the refactor should achieve (e.g. "extract tag normalization into `lib/utils.ts`", "reduce handler to under 120 lines", "rename internal variable for clarity")

## Steps

1. **READ** the target file in full — understand what every part does before touching anything.
2. **READ** all tests that cover the target (search `lib/__tests__/` for the module name or related imports).
3. **BASELINE** — run tests and confirm they all pass before making any change:
   ```bash
   npm run test
   ```
   If any tests are already failing, stop and report — do not proceed with a broken baseline.
4. **PLAN** the refactor precisely: what moves, what is renamed, what is extracted. No scope creep — stay within the stated goal.
5. **APPLY** the refactor in small, logical steps — one unit at a time (e.g. extract one function, then verify, then extract the next).
6. **VERIFY** after each step:
   ```bash
   npm run typecheck && npm run test
   ```
   If either fails, revert that step before proceeding.
7. **UPDATE TESTS** only if the public API changed (renamed export, changed signature). Update call sites; do not weaken assertions.
8. **FINAL GATES**:
   ```bash
   npm run typecheck && npm run lint && npm run test && npm run build
   ```
9. **REPORT** — list what changed structurally, confirm all gates pass, explicitly note any public API changes.

## Checks

- [ ] All pre-existing tests still pass — none deleted or weakened
- [ ] No behaviour changes (only structural/naming changes, or explicitly approved changes)
- [ ] No `any` types introduced
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] Public API surface is unchanged, or changes are explicitly documented in the report

## Example Call

> "Refactor `lib/schema.ts` to extract the Drizzle index definitions into named constants for readability"

Expected output: same exports, same runtime behaviour, no test changes, cleaner internal structure, all gates green.
