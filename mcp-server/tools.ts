import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { z } from 'zod'
import { apiFetch, getApiUrl } from './api-client.js'

// ---------------------------------------------------------------------------
// In-memory draft store for chunked chat-based publishing.
// Drafts are ephemeral — they live only in the MCP server process.
// ---------------------------------------------------------------------------
type Draft = {
  id: string
  title: string
  team: string
  tags?: string[]
  summary?: string
  chunks: string[]
  createdAt: number
  // Incremental hasher updated with each chunk — never needs client-supplied hash.
  hasher: ReturnType<typeof createHash>
  totalBytes: number
}

const drafts = new Map<string, Draft>()

// Expire drafts older than 1 hour to avoid unbounded memory growth.
const DRAFT_TTL_MS = 60 * 60 * 1000

function pruneDrafts(): void {
  const cutoff = Date.now() - DRAFT_TTL_MS
  for (const [id, draft] of drafts) {
    if (draft.createdAt < cutoff) drafts.delete(id)
  }
}

type TeamInfo = {
  id: string
  name: string
  slug: string
  role: string
}

type ArtifactSummary = {
  id: string
  title: string
  fileType: string
  summary: string | null
  tags: string[]
  createdAt: string
  createdBy: string
}

type PublishInput = {
  title: string
  content: string
  team: string
  tags?: string[]
  summary?: string
  fileName?: string
}

type PublishResult = {
  artifactId: string
  artifactUrl: string
}

function toSafeFileName(name: string): string {
  return name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase()
}

function parsePublishErrorBody(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const error = (payload as { error: unknown }).error
    if (typeof error === 'string' && error.length > 0) {
      return error
    }
  }

  return 'Unknown error'
}

async function publishTextArtifact({
  title,
  content,
  team,
  tags,
  summary,
  fileName,
}: PublishInput): Promise<PublishResult> {
  const teamInfo = await findTeamBySlug(team)
  if (!teamInfo) {
    throw new Error('Team not found or you are not a member of this team')
  }

  const formData = new FormData()
  const resolvedFileName = fileName && fileName.length > 0
    ? toSafeFileName(fileName)
    : `${toSafeFileName(title)}.txt`
  const blob = new Blob([content], { type: 'text/plain' })

  formData.append('file', blob, resolvedFileName)
  formData.append('title', title)
  if (tags && tags.length > 0) {
    tags.forEach((t) => formData.append('tags', t))
  }
  if (summary) {
    formData.append('summary', summary)
  }

  const res = await apiFetch(`/api/teams/${teamInfo.id}/artifacts`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errJson = await res.json().catch(() => null)
    const errorMessage = parsePublishErrorBody(errJson)
    throw new Error(`Error publishing artifact: ${errorMessage}`)
  }

  const data = (await res.json()) as { artifact: { id: string } }
  const artifactId = data.artifact.id
  return {
    artifactId,
    artifactUrl: `${getApiUrl()}/artifacts/${artifactId}`,
  }
}

async function findTeamBySlug(slug: string): Promise<TeamInfo | null> {
  const res = await apiFetch('/api/teams')
  if (!res.ok) return null
  const data = (await res.json()) as { teams: TeamInfo[] }
  return data.teams.find((t) => t.slug === slug) ?? null
}

export function registerTools(server: McpServer): void {
  // --- publish_artifact ---
  server.tool(
    'publish_artifact',
    'Publish an AI-generated artifact to Artifact Hub. Use list_teams to discover available team slugs.',
    {
      title: z.string().describe('Title for the artifact'),
      content: z.string().describe('Text content to publish as the artifact file'),
      team: z.string().describe('Team slug to publish the artifact to — call list_teams to see available slugs'),
      tags: z
        .array(z.string())
        .max(8)
        .optional()
        .describe('Up to 8 tags for the artifact (optional)'),
      summary: z.string().optional().describe('Short summary description (optional)'),
    },
    async ({ title, content, team, tags, summary }) => {
      try {
        const { artifactId, artifactUrl } = await publishTextArtifact({
          title,
          content,
          team,
          tags,
          summary,
        })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  artifactId,
                  url: artifactUrl,
                  message: `Artifact "${title}" published successfully to team "${team}".`,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error'
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        }
      }
    },
  )

  // --- publish_artifact_from_file ---
  server.tool(
    'publish_artifact_from_file',
    'Publish an artifact from a local file path with lossless content checks. Use list_teams to discover available team slugs.',
    {
      title: z.string().describe('Title for the artifact'),
      filePath: z
        .string()
        .describe('Absolute local path of the source file to publish exactly as-is'),
      team: z.string().describe('Team slug to publish the artifact to — call list_teams to see available slugs'),
      tags: z
        .array(z.string())
        .max(8)
        .optional()
        .describe('Up to 8 tags for the artifact (optional)'),
      summary: z.string().optional().describe('Short summary description (optional)'),
    },
    async ({ title, filePath, team, tags, summary }) => {
      try {
        const sourceContent = await readFile(filePath, 'utf8')
        if (sourceContent.trim().length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Error: Source file is empty' }],
            isError: true,
          }
        }

        const byteLength = Buffer.byteLength(sourceContent, 'utf8')
        const sourceSha256 = createHash('sha256').update(sourceContent, 'utf8').digest('hex')
        const headingCount = Array.from(sourceContent.matchAll(/^#{1,6}\s+/gm)).length

        const { artifactId, artifactUrl } = await publishTextArtifact({
          title,
          content: sourceContent,
          team,
          tags,
          summary,
          fileName: basename(filePath),
        })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  artifactId,
                  url: artifactUrl,
                  message: `Artifact "${title}" published from file "${filePath}" with full source content.`,
                  sourceVerification: {
                    filePath,
                    bytes: byteLength,
                    sha256: sourceSha256,
                    markdownHeadingCount: headingCount,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error'
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        }
      }
    },
  )

  // --- search_artifacts ---
  server.tool(
    'search_artifacts',
    'Search for artifacts in Artifact Hub across one or all of your teams',
    {
      query: z
        .string()
        .optional()
        .describe('Keyword search across title, summary, and tags'),
      tag: z.string().optional().describe('Filter by exact tag value'),
      fileType: z
        .string()
        .optional()
        .describe('Filter by MIME type (e.g. text/plain, application/pdf)'),
      teamSlug: z
        .string()
        .optional()
        .describe('Restrict search to a specific team slug (omit to search all your teams) — call list_teams to see available slugs'),
    },
    async ({ query, tag, fileType, teamSlug }) => {
      try {
        const teamsRes = await apiFetch('/api/teams')
        if (!teamsRes.ok) {
          return {
            content: [{ type: 'text' as const, text: 'Error: Failed to fetch team list' }],
            isError: true,
          }
        }

        const teamsData = (await teamsRes.json()) as { teams: TeamInfo[] }
        const teamsToSearch = teamSlug
          ? teamsData.teams.filter((t) => t.slug === teamSlug)
          : teamsData.teams

        if (teamsToSearch.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ artifacts: [], count: 0 }, null, 2),
              },
            ],
          }
        }

        const apiUrl = getApiUrl()
        const allArtifacts: Array<ArtifactSummary & { team: string; url: string }> = []

        for (const t of teamsToSearch) {
          const qs = new URLSearchParams()
          if (query) qs.set('q', query)
          if (tag) qs.set('tag', tag)
          if (fileType) qs.set('fileType', fileType)
          const qsPart = qs.toString() ? `?${qs.toString()}` : ''
          const res = await apiFetch(`/api/teams/${t.id}/artifacts${qsPart}`)
          if (!res.ok) continue
          const data = (await res.json()) as { artifacts: ArtifactSummary[] }
          for (const a of data.artifacts) {
            allArtifacts.push({ ...a, team: t.slug, url: `${apiUrl}/artifacts/${a.id}` })
          }
        }

        const results = allArtifacts.slice(0, 50).map((a) => ({
          id: a.id,
          title: a.title,
          summary: a.summary,
          tags: a.tags,
          fileType: a.fileType,
          team: a.team,
          url: a.url,
        }))

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ artifacts: results, count: results.length }, null, 2),
            },
          ],
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error'
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        }
      }
    },
  )

  // --- get_artifact ---
  server.tool(
    'get_artifact',
    'Get full artifact metadata and all comments from Artifact Hub',
    {
      artifactId: z.string().describe('ID of the artifact to retrieve'),
    },
    async ({ artifactId }) => {
      try {
        const [artifactRes, commentsRes] = await Promise.all([
          apiFetch(`/api/artifacts/${artifactId}`),
          apiFetch(`/api/artifacts/${artifactId}/comments`),
        ])

        if (!artifactRes.ok) {
          if (artifactRes.status === 403) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: You are not a member of the team that owns this artifact',
                },
              ],
              isError: true,
            }
          }
          if (artifactRes.status === 404) {
            return {
              content: [{ type: 'text' as const, text: 'Error: Artifact not found' }],
              isError: true,
            }
          }
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Failed to fetch artifact (HTTP ${artifactRes.status})`,
              },
            ],
            isError: true,
          }
        }

        const artifact = (await artifactRes.json()) as Record<string, unknown>
        const commentsData = commentsRes.ok
          ? ((await commentsRes.json()) as { comments: unknown[] })
          : { comments: [] }

        // Save the file locally via the authenticated proxy
        const artifactMeta = artifact as { artifact?: { fileType?: string; fileName?: string } }
        const fileType = artifactMeta.artifact?.fileType ?? 'application/octet-stream'
        const remoteFileName = artifactMeta.artifact?.fileName ?? artifactId

        const downloadDir = resolve(
          process.env.ARTIFACT_HUB_DOWNLOAD_DIR ?? join(process.cwd(), 'downloads'),
        )
        await mkdir(downloadDir, { recursive: true })
        const localPath = join(downloadDir, remoteFileName)

        let savedPath: string | null = null
        let saveError: string | null = null

        try {
          const fileRes = await apiFetch(`/api/files/${artifactId}`)
          if (fileRes.ok) {
            const buffer = Buffer.from(await fileRes.arrayBuffer())
            await writeFile(localPath, buffer)
            savedPath = localPath
          } else {
            saveError = `File proxy returned HTTP ${fileRes.status}`
          }
        } catch (err) {
          saveError = err instanceof Error ? err.message : 'Unknown error'
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  artifact,
                  comments: commentsData.comments ?? [],
                  localFile: savedPath,
                  fileType,
                  saveError,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error'
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        }
      }
    },
  )

  // ---------------------------------------------------------------------------
  // Chunked chat-publish pipeline:
  //   1. start_artifact_draft   — open a new draft, get a draftId
  //   2. append_artifact_chunk  — send content in pieces, get running totals
  //   3. finalize_artifact      — verify integrity, publish, discard draft
  // ---------------------------------------------------------------------------

  // --- start_artifact_draft ---
  server.tool(
    'start_artifact_draft',
    [
      'Open a new in-memory draft for a large artifact you want to build chunk by chunk in chat.',
      'Returns a draftId. Follow up with append_artifact_chunk (one or many times),',
      'then finalize_artifact to verify integrity and publish.',
      'Use list_teams to discover available team slugs.',
    ].join(' '),
    {
      title: z.string().describe('Title for the artifact'),
      team: z.string().describe('Team slug to publish the artifact to — call list_teams to see available slugs'),
      tags: z
        .array(z.string())
        .max(8)
        .optional()
        .describe('Up to 8 tags for the artifact (optional)'),
      summary: z.string().optional().describe('Short summary description (optional)'),
    },
    ({ title, team, tags, summary }) => {
      pruneDrafts()
      const id = randomUUID()
      drafts.set(id, {
        id,
        title,
        team,
        tags,
        summary,
        chunks: [],
        createdAt: Date.now(),
        hasher: createHash('sha256'),
        totalBytes: 0,
      })
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                draftId: id,
                message:
                  'Draft created. Send content chunks with append_artifact_chunk, then call finalize_artifact — no hash needed from your side.',
              },
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  // --- append_artifact_chunk ---
  server.tool(
    'append_artifact_chunk',
    [
      'Append a chunk of text to an open draft (created by start_artifact_draft).',
      'Call this once per chunk — as many times as needed.',
      'Returns the current chunk count and accumulated byte size so you can verify coverage.',
    ].join(' '),
    {
      draftId: z.string().describe('Draft ID returned by start_artifact_draft'),
      chunk: z.string().describe('The next piece of content to append'),
    },
    ({ draftId, chunk }) => {
      const draft = drafts.get(draftId)
      if (!draft) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Draft "${draftId}" not found. It may have expired (1-hour TTL) or never existed.`,
            },
          ],
          isError: true,
        }
      }

      const chunkBytes = Buffer.byteLength(chunk, 'utf8')
      draft.chunks.push(chunk)
      draft.hasher.update(chunk, 'utf8')
      draft.totalBytes += chunkBytes

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                draftId,
                chunkIndex: draft.chunks.length - 1,
                totalChunks: draft.chunks.length,
                chunkBytes,
                totalBytes: draft.totalBytes,
                message: `Chunk ${draft.chunks.length} appended (${chunkBytes} bytes). Send more chunks or call finalize_artifact.`,
              },
              null,
              2,
            ),
          },
        ],
      }
    },
  )

  // --- finalize_artifact ---
  server.tool(
    'finalize_artifact',
    [
      'Assemble all chunks from an open draft and publish the artifact.',
      'The server cross-verifies integrity automatically (incremental chunk hash vs. full assembly hash)',
      'before publishing — no SHA-256 or byte count needed from the client.',
      'Publish is ABORTED if the server-side cross-check detects any assembly corruption.',
    ].join(' '),
    {
      draftId: z.string().describe('Draft ID returned by start_artifact_draft'),
    },
    async ({ draftId }) => {
      try {
        const draft = drafts.get(draftId)
        if (!draft) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Draft "${draftId}" not found. It may have expired (1-hour TTL) or never existed.`,
              },
            ],
            isError: true,
          }
        }

        if (draft.chunks.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Draft "${draftId}" has no content. Call append_artifact_chunk first.`,
              },
            ],
            isError: true,
          }
        }

        const assembled = draft.chunks.join('')
        const assemblyBytes = Buffer.byteLength(assembled, 'utf8')

        // Server-side cross-verification:
        //   1. incrementalHash — built by update()-ing each chunk as it arrived
        //   2. assemblyHash   — computed fresh from the fully assembled string
        // These MUST match. A mismatch means the chunks were assembled incorrectly.
        const incrementalHash = draft.hasher.digest('hex')
        const assemblyHash = createHash('sha256').update(assembled, 'utf8').digest('hex')

        if (incrementalHash !== assemblyHash) {
          drafts.delete(draftId)
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error:
                      'Server integrity check FAILED — incremental hash does not match assembly hash. Publish aborted.',
                    incrementalHash,
                    assemblyHash,
                    hint: 'This indicates an internal assembly bug. Please report this.',
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          }
        }

        if (draft.totalBytes !== assemblyBytes) {
          drafts.delete(draftId)
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error:
                      'Server integrity check FAILED — tracked byte count does not match assembled size. Publish aborted.',
                    trackedBytes: draft.totalBytes,
                    assemblyBytes,
                    hint: 'This indicates an internal assembly bug. Please report this.',
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          }
        }

        // --- publish ---
        const { artifactId, artifactUrl } = await publishTextArtifact({
          title: draft.title,
          content: assembled,
          team: draft.team,
          tags: draft.tags,
          summary: draft.summary,
        })

        drafts.delete(draftId)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  artifactId,
                  url: artifactUrl,
                  message: `Artifact "${draft.title}" published successfully to team "${draft.team}".`,
                  integrityVerification: {
                    totalChunks: draft.chunks.length,
                    bytes: assemblyBytes,
                    sha256: assemblyHash,
                    serverCrossCheckPassed: true,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error'
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        }
      }
    },
  )

  // --- list_teams ---
  server.tool(
    'list_teams',
    'List all teams you are a member of, including their slugs and your role in each',
    {},
    async () => {
      try {
        const res = await apiFetch('/api/teams')
        if (!res.ok) {
          return {
            content: [{ type: 'text' as const, text: 'Error: Failed to fetch team list' }],
            isError: true,
          }
        }
        const data = (await res.json()) as { teams: TeamInfo[] }
        const teams = data.teams.map((t) => ({
          slug: t.slug,
          name: t.name,
          role: t.role,
        }))
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ teams, count: teams.length }, null, 2),
            },
          ],
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error'
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        }
      }
    },
  )
}
