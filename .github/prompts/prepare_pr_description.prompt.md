---
description: "Draft a PR description from a story implementation in Artifact Hub"
---

# Prepare PR Description

## Goal

Write a clear, structured PR description that links changes back to the story acceptance criteria and includes a verified review-gate summary. Output should be copy-pasteable.

## Inputs

- **Story file**: path to the story (e.g. `docs/implementation-artifacts/1-3-clerk-authentication-route-protection.md`)
- **Gate results**: output of `npm run typecheck && npm run lint && npm run test && npm run build`
- **Files changed**: list of files modified (or describe what changed if no diff available)

## Steps

1. **READ** the story file — extract: goal statement, and every acceptance criterion verbatim.
2. **IDENTIFY** all files changed (from input or by inspecting the story's expected outputs).
3. **MAP** each acceptance criterion to the implementation — mark `[x]` if satisfied, `[ ]` if not yet met (explain why).
4. **DRAFT** the PR description using this exact structure:

```markdown
## Summary

<1–2 sentence description of what this PR does and why — written for a reviewer who has not read the story>

## Story

`docs/implementation-artifacts/<story-file>.md`

## Changes

- `lib/auth.ts` — <what changed and why>
- `middleware.ts` — <what changed and why>
- `lib/__tests__/auth.test.ts` — <new tests: what they cover>
- ...

## Acceptance Criteria

- [x] AC1: <exact text from story>
- [x] AC2: ...
- [ ] AC3: <if not yet met — explain what is deferred and why>

## Review Gates

- [x] `npm run typecheck` — passed
- [x] `npm run lint` — passed
- [x] `npm run test` — passed (N tests)
- [x] `npm run build` — passed
- [ ] `cd mcp-server && npm run build` — N/A (not a MCP story) / passed

## Notes

<Anything a reviewer should know: deferred items, known limitations, follow-up stories, workarounds>
```

5. **VERIFY** every AC from the story is present in the criteria list — none silently omitted.
6. **OUTPUT** the final draft ready to paste.

## Checks

- [ ] Summary is one or two clear sentences — no jargon
- [ ] Every acceptance criterion from the story file is listed (checked or with explanation)
- [ ] All four (or five for MCP) review gates are listed with actual results
- [ ] All changed files are listed with a one-line description of the change
- [ ] Deferred items are noted explicitly, not omitted

## Example Call

> "Prepare PR description for story 1-2 (database schema + Turso integration). Gates all pass. Files changed: `lib/schema.ts`, `lib/db.ts`, `lib/__tests__/schema.test.ts`, `drizzle.config.ts`."
