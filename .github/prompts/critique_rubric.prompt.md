---
description: "Score a story implementation against acceptance criteria in Artifact Hub"
---

# Critique Rubric

## Goal

Score a completed story implementation against its acceptance criteria and review gates. Produce a structured table with a clear pass/fail per item, actionable fixes for every failure, and a final verdict.

## Inputs

- **Story file**: path to `docs/implementation-artifacts/<story>.md`
- **Files changed**: list of files modified (or description of what was implemented)
- **Gate results**: raw output of the review gate commands

## Steps

1. **READ** the story file — extract every acceptance criterion (AC) verbatim.
2. **READ** the implementation files listed in the input.
3. **SCORE** each AC:

| # | Acceptance Criterion | Status | Notes |
|---|---|---|---|
| AC1 | `<exact text from story>` | ✅ Pass / ❌ Fail / ⚠️ Partial | `<why, with file/line if failing>` |
| AC2 | ... | | |

4. **SCORE** review gates:

| Gate | Command | Result | Notes |
|---|---|---|---|
| Types | `npm run typecheck` | ✅ / ❌ | error count or "clean" |
| Lint | `npm run lint` | ✅ / ❌ | violation count or "clean" |
| Tests | `npm run test` | ✅ / ❌ | pass/fail count |
| Build | `npm run build` | ✅ / ❌ | "success" or first error |
| MCP Build | `cd mcp-server && npm run build` | ✅ / ❌ / N/A | |

5. **FINAL VERDICT**:
   - ✅ **Story complete** — all ACs pass, all gates green. State which story to tackle next (check `docs/implementation-artifacts/sprint-status.yaml`).
   - ⚠️ **Partially complete** — list every blocking item with its smallest fix.
   - ❌ **Not complete** — list all failures. For each: exact problem + smallest code or config fix (snippet preferred).

6. For every failure: provide the **exact smallest fix** — a code snippet, a command, or a config change. Do not describe what to fix in vague terms.

## Checks

- [ ] Every AC from the story file is scored — none omitted
- [ ] All five review gates are scored (MCP gate marked N/A if not a MCP story)
- [ ] Every ❌ or ⚠️ item has a concrete suggested fix
- [ ] No ✅ given for an AC that was not verifiable from the provided files

## Example Call

> "Critique story 1-2 (database schema + Turso integration). Files changed: `lib/schema.ts`, `lib/db.ts`, `drizzle.config.ts`, `lib/__tests__/schema.test.ts`. All gates pass."

Expected output: AC table with all items marked ✅, gate table all green, verdict "Story complete — next story: 1-3."
