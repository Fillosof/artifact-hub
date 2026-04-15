import { NextResponse } from 'next/server'
import { enrichArtifact } from '@/lib/enrichment'

// POST /api/enrich — internal endpoint called fire-and-forget by the artifact publish route
// Protected by the ENRICH_SECRET header to prevent external invocation (ARCH12)
export async function POST(request: Request) {
  // Validate the shared secret
  const incomingSecret = request.headers.get('X-Enrich-Secret')
  if (!incomingSecret || incomingSecret !== process.env.ENRICH_SECRET) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 401 })
  }

  // Parse and validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('artifactId' in body) ||
    typeof (body as Record<string, unknown>).artifactId !== 'string'
  ) {
    return NextResponse.json(
      { error: 'artifactId is required', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  const { artifactId } = body as { artifactId: string }

  try {
    await enrichArtifact(artifactId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    // enrichArtifact already logs and sets enrichmentStatus='failed'; artifact remains available
    console.error('[POST /api/enrich] enrichment failed for artifact:', artifactId, err)
    return NextResponse.json(
      { error: 'Enrichment failed', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
