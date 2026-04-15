---
applyTo: "app/**/*.tsx,app/**/*.css,components/**/*.tsx"
description: "Frontend-specific Copilot instructions for Artifact Hub"
---

# Frontend Instructions — Artifact Hub

## Component Model

- **Server Components by default**: files in `app/` are async Server Components. Fetch data directly in the component body using `db` + auth. No `useEffect` fetch loops.
- **Client Components**: add `"use client"` only when you need browser APIs (`useState`, `useEffect`, event handlers). Keep them small and push them to leaf nodes.
- Components over ~200 lines should be split into smaller, focused components.

```typescript
// ✅ Server Component — data fetch inline, no client bundle cost
export default async function ArtifactPage({ params }: { params: { id: string } }) {
  const rows = await db.select().from(artifacts).where(eq(artifacts.id, params.id))
  return <ArtifactDetail artifact={rows[0]} />
}

// ✅ Client Component — only what needs browser interactivity
'use client'
export function TagEditor({ initialTags }: { initialTags: string[] }) {
  const [tags, setTags] = useState(initialTags)
  // ...
}
```

## shadcn/ui Components

- Components live in `components/ui/`. **Do not edit them directly** — wrap or compose them.
- Import from `@/components/ui/button`, `@/components/ui/input`, etc.
- Use `cn()` from `@/lib/utils` to merge conditional Tailwind classes.

```typescript
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

<Button variant="outline" className={cn('w-full', isLoading && 'opacity-50')}>
  Upload
</Button>
```

## Tailwind CSS v4

- Use utility classes exclusively — no inline `style={}` props.
- Tailwind v4 uses a CSS-first config via `app/globals.css` — there is no `tailwind.config.js`.
- Color tokens and spacing come from CSS variables defined in `app/globals.css`. Do not use arbitrary hex values.

## File Preview Rules (Security)

`artifacts.fileUrl` is an **internal** Vercel Blob URL — it must never be used as a browser-facing `src`. All file access goes through the authenticated proxy route.

```typescript
// ✅ Authenticated proxy — safe
<img src={`/api/artifacts/${id}/file`} alt={artifact.title} />

// ❌ Raw Blob URL — never do this
<img src={artifact.fileUrl} alt={artifact.title} />
```

Format-specific rendering rules:
- **Images**: `<img>` pointing to the proxy route.
- **PDFs**: `<iframe>` pointing to proxy route with appropriate headers.
- **HTML artifacts**: `<iframe sandbox="allow-scripts">` — **never** `dangerouslySetInnerHTML`.
- **Unknown types**: a download `<a>` link via the proxy route.

## Enrichment Status UI

Artifacts have `enrichmentStatus: 'pending' | 'complete' | 'failed'`. Always render it in gallery and detail views:

- `pending` → loading indicator or "Processing…" badge (no summary/tags shown yet).
- `complete` → render summary and tags.
- `failed` → "Enrichment failed" message with a retry button (Story 5.3).

## Accessibility (WCAG 2.1 AA target)

- Every `<img>` needs a descriptive `alt` attribute (not empty unless purely decorative).
- Form inputs must have explicit `<label>` elements — do not rely on `placeholder` alone.
- Interactive elements must be keyboard-reachable: use `<button>`, not `<div onClick>`.
- Color contrast must meet WCAG AA — use design system tokens, not arbitrary hex values.
- Use semantic HTML (`<nav>`, `<main>`, `<article>`, `<section>`) rather than `<div>` soup.

## Navigation

Use Next.js `<Link>` for all internal navigation, not `<a href>`.

```typescript
import Link from 'next/link'

// ✅
<Link href={`/artifacts/${id}`}>View artifact</Link>

// ❌
<a href={`/artifacts/${id}`}>View artifact</a>
```

## Do / Don't

**Do:**
- Use `@/` alias for all internal imports.
- Keep Server Components for data-fetching, Client Components only for interactivity.
- Use shadcn/ui + Tailwind for all UI — no new CSS files unless extending `app/globals.css`.
- Use Next.js `loading.tsx` and `error.tsx` conventions for loading and error states.
- Handle all three enrichment states (`pending` / `complete` / `failed`) in any component that shows artifact data.

**Don't:**
- Don't use `<a href>` for internal routes — use `<Link>`.
- Don't fetch data inside Client Components with `useEffect` when a Server Component parent can do it.
- Don't pass raw Blob URLs to any `<img>`, `<iframe>`, or `<a>` element.
- Don't use `dangerouslySetInnerHTML` — use sandboxed iframes for HTML artifacts.
- Don't leave `console.log` calls in production Server Components.
- Don't add `any` — use Drizzle's `$inferSelect` types for artifact data.
