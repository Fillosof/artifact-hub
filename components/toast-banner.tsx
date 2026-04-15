'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export function ToastBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Lazily initialise from the URL — the function runs once on first render,
  // before the component is committed, so it is not an effect-based setState.
  const [message, setMessage] = useState<string | null>(() => {
    if (searchParams.get('deleted') === 'true') return 'Artifact Deleted'
    if (searchParams.get('published') === 'true') return 'Artifact Published'
    return null
  })

  // Track whether we have already cleaned the URL so the effect does not
  // re-run when router/pathname/searchParams references change after replace().
  const cleanedUp = useRef(false)

  useEffect(() => {
    if (!message || cleanedUp.current) return
    cleanedUp.current = true

    // Remove toast-trigger params from the URL so a refresh does not re-show the toast
    const params = new URLSearchParams(searchParams.toString())
    params.delete('deleted')
    params.delete('published')
    const newUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl)

    // Auto-dismiss after 4 s
    const timer = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [message, pathname, router, searchParams])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
    >
      <CheckCircle className="size-4 shrink-0 text-green-400 dark:text-green-600" />
      {message}
    </div>
  )
}
