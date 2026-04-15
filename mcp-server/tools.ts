import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { apiFetch, getApiUrl } from './api-client.js'

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
    'Publish an AI-generated artifact to Artifact Hub',
    {
      title: z.string().describe('Title for the artifact'),
      content: z.string().describe('Text content to publish as the artifact file'),
      team: z.string().describe('Team slug to publish the artifact to'),
      tags: z
        .array(z.string())
        .max(8)
        .optional()
        .describe('Up to 8 tags for the artifact (optional)'),
      summary: z.string().optional().describe('Short summary description (optional)'),
    },
    async ({ title, content, team, tags, summary }) => {
      try {
        const teamInfo = await findTeamBySlug(team)
        if (!teamInfo) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: Team not found or you are not a member of this team',
              },
            ],
            isError: true,
          }
        }

        const formData = new FormData()
        const safeFileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`
        const blob = new Blob([content], { type: 'text/plain' })
        formData.append('file', blob, safeFileName)
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
          const err = (await res.json().catch(() => ({ error: 'Unknown error' }))) as {
            error: string
          }
          return {
            content: [{ type: 'text' as const, text: `Error publishing artifact: ${err.error}` }],
            isError: true,
          }
        }

        const data = (await res.json()) as { artifact: { id: string } }
        const artifactId = data.artifact.id
        const artifactUrl = `${getApiUrl()}/artifacts/${artifactId}`

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
        .describe('Restrict search to a specific team slug (omit to search all your teams)'),
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

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { artifact, comments: commentsData.comments ?? [] },
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
}
