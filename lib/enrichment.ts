import Anthropic from '@anthropic-ai/sdk'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { artifacts, artifactTags, teams } from './schema'
import { normalizeTags } from './utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Call the Claude API to generate tags and a summary for an artifact,
 * then persist the results to the database.
 *
 * On any error the enrichmentStatus is set to 'failed' and the error is re-thrown.
 */
export async function enrichArtifact(artifactId: string): Promise<void> {
  // 1. Fetch the artifact
  const [artifact] = await db
    .select({
      id: artifacts.id,
      title: artifacts.title,
      fileType: artifacts.fileType,
      teamId: artifacts.teamId,
      sourceUrl: artifacts.sourceUrl,
    })
    .from(artifacts)
    .where(eq(artifacts.id, artifactId))
    .limit(1)

  if (!artifact) {
    throw new Error(`Artifact not found: ${artifactId}`)
  }

  // 2. Fetch the team name
  const [team] = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.id, artifact.teamId))
    .limit(1)

  const teamName = team?.name ?? 'Unknown Team'

  // 3. Fetch existing tag vocabulary for this team (for context-aware tagging)
  const tagRows = await db
    .select({ tag: artifactTags.tag })
    .from(artifactTags)
    .innerJoin(artifacts, eq(artifactTags.artifactId, artifacts.id))
    .where(eq(artifacts.teamId, artifact.teamId))

  const teamTags = [...new Set(tagRows.map((r) => r.tag))]

  // 4. Call Claude
  let tags: string[]
  let summary: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: buildPrompt({
            title: artifact.title,
            fileType: artifact.fileType,
            teamName,
            teamTags,
            sourceUrl: artifact.sourceUrl ?? null,
          }),
        },
      ],
    })

    const block = message.content[0]
    if (!block || block.type !== 'text') {
      throw new Error('Unexpected Claude response content type')
    }

    const parsed = JSON.parse(block.text) as { tags: string[]; summary: string }
    tags = normalizeTags(Array.isArray(parsed.tags) ? parsed.tags : [])
    summary = typeof parsed.summary === 'string' ? parsed.summary : ''
  } catch (err) {
    console.error('[enrichArtifact] Claude API error:', err)
    await db
      .update(artifacts)
      .set({ enrichmentStatus: 'failed' })
      .where(eq(artifacts.id, artifactId))
    throw err
  }

  // 5. Upsert artifact_tags: delete existing then re-insert normalized set
  await db.delete(artifactTags).where(eq(artifactTags.artifactId, artifactId))
  if (tags.length > 0) {
    await db.insert(artifactTags).values(tags.map((tag) => ({ artifactId, tag })))
  }

  // 6. Persist summary + mark enrichment complete
  await db
    .update(artifacts)
    .set({ summary, enrichmentStatus: 'complete' })
    .where(eq(artifacts.id, artifactId))
}

interface PromptContext {
  title: string
  fileType: string
  teamName: string
  teamTags: string[]
  sourceUrl: string | null
}

function buildPrompt({ title, fileType, teamName, teamTags, sourceUrl }: PromptContext): string {
  const tagHint =
    teamTags.length > 0
      ? `\nExisting team tags (reuse when relevant): ${teamTags.join(', ')}`
      : ''
  const sourceHint = sourceUrl ? `\nSource URL: ${sourceUrl}` : ''

  return `You are a metadata assistant for an AI artifact management platform.

Given the artifact details below, return ONLY a JSON object with this exact shape:
{"tags": ["tag1", "tag2"], "summary": "One to two sentence description."}

Rules:
- tags: 3–8 lowercase tags (single words or hyphenated); prefer reusing existing team tags when relevant
- summary: 1–2 sentences describing what this artifact is and its purpose
- Output ONLY the JSON object — no explanation, no markdown fences

Artifact details:
Title: ${title}
File type: ${fileType}
Team: ${teamName}${sourceHint}${tagHint}`
}

