import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  // API routes handle their own auth (Clerk session OR Bearer API key)
  '/api/(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jld(?!on)|bmp|tiff?|gif|png|jpe?g|svg|ttf|ico|cur|heic|webp|avif)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
