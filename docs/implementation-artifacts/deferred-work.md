# Deferred Work

Items identified during review but deferred to future stories.

---

## From Story 3.1 (2026-04-15)

- **MIME type allowlist** — Story 3.1 validates presence and file size server-side but accepts any MIME type. A future security story should define an explicit allowlist (e.g. image/*, application/pdf, text/html) and reject unsupported types with a clear error code. FR12 mentions "validate MIME type server-side" but the allowlist was not defined in MVP scope.

- **Proxy Cache-Busting** — The file proxy returns `Cache-Control: private, max-age=3600`. If a blob URL is ever replaced (future story or admin action), cached responses could serve stale content. Consider cache invalidation strategy when artifact file replacement is implemented.
