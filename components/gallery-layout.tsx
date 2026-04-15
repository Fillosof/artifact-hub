'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'

interface GalleryLayoutProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function GalleryLayout({ sidebar, children }: GalleryLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)]">
      {/* Desktop sidebar — hidden below md breakpoint */}
      <aside
        className="hidden h-full w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 p-4 dark:border-zinc-800 md:flex"
        aria-label="Gallery navigation"
      >
        {sidebar}
      </aside>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        id="gallery-drawer"
        inert={!drawerOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-4 overflow-y-auto border-r border-zinc-200 bg-white p-4 transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950 md:hidden ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Gallery navigation"
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Filters &amp; Actions
          </span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close navigation</span>
          </button>
        </div>
        {sidebar}
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile-only top bar with hamburger */}
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open filters and actions"
            aria-expanded={drawerOpen}
            aria-controls="gallery-drawer"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Filters &amp; Actions
          </span>
        </div>

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
