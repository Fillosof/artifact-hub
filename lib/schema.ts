import { sql } from 'drizzle-orm'
import { text, integer, sqliteTable, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

export const teams = sqliteTable('teams', {
  id:        text('id').primaryKey(),                        // nanoid
  name:      text('name').notNull(),
  slug:      text('slug').notNull().unique(),                 // URL-safe; used by MCP team slug param
  createdBy: text('created_by').notNull(),                   // Clerk userId
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const teamMemberships = sqliteTable('team_memberships', {
  id:       text('id').primaryKey(),                         // nanoid
  teamId:   text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId:   text('user_id').notNull(),                       // Clerk userId
  role:     text('role', { enum: ['member', 'admin'] }).notNull().default('member'),
  joinedAt: integer('joined_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  uniqTeamUser: uniqueIndex('idx_team_memberships_team_user').on(t.teamId, t.userId),
  idxUserId:    index('idx_team_memberships_user_id').on(t.userId),
}))

export const teamInvitations = sqliteTable('team_invitations', {
  id:         text('id').primaryKey(),
  teamId:     text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  email:      text('email').notNull(),
  role:       text('role', { enum: ['member', 'admin'] }).notNull().default('member'),
  status:     text('status', { enum: ['pending', 'accepted'] }).notNull().default('pending'),
  invitedBy:  text('invited_by').notNull(),
  createdAt:  integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  expiresAt:  integer('expires_at', { mode: 'timestamp_ms' }),
  acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),
}, (t) => ({
  uniqPendingInvite: uniqueIndex('idx_team_invitations_pending')
    .on(t.teamId, t.email)
    .where(sql`status = 'pending'`),
  idxEmail:  index('idx_team_invitations_email').on(t.email),
  idxTeamId: index('idx_team_invitations_team_id').on(t.teamId),
}))

export const artifacts = sqliteTable('artifacts', {
  id:               text('id').primaryKey(),                 // nanoid
  teamId:           text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  title:            text('title').notNull(),
  fileUrl:          text('file_url').notNull(),              // Vercel Blob URL — internal only, NEVER returned to client
  fileName:         text('file_name').notNull(),             // Original filename — used for Content-Disposition (FR27)
  fileType:         text('file_type').notNull(),             // MIME type: 'image/png', 'application/pdf', 'text/html', etc.
  sourceUrl:        text('source_url'),                      // nullable — optional originating tool link (FR13)
  summary:          text('summary'),                         // nullable — null while enrichment pending or if failed (FR23)
  enrichmentStatus: text('enrichment_status', { enum: ['pending', 'complete', 'failed'] }).notNull().default('pending'),
  createdBy:        text('created_by').notNull(),            // Clerk userId
  createdAt:        integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  idxTeamId:    index('idx_artifacts_team_id').on(t.teamId),
  idxCreatedBy: index('idx_artifacts_created_by').on(t.createdBy),
}))

export const artifactTags = sqliteTable('artifact_tags', {
  artifactId: text('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  tag:        text('tag').notNull(),                         // always lowercase + trimmed (normalized on write — FR33)
}, (t) => ({
  pk: primaryKey({ columns: [t.artifactId, t.tag] }),
}))

export const comments = sqliteTable('comments', {
  id:         text('id').primaryKey(),                       // nanoid
  artifactId: text('artifact_id').notNull().references(() => artifacts.id, { onDelete: 'cascade' }),
  userId:     text('user_id').notNull(),                     // Clerk userId
  content:    text('content').notNull(),
  createdAt:  integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => ({
  idxArtifactId: index('idx_comments_artifact_id').on(t.artifactId),
}))

export const apiKeys = sqliteTable('api_keys', {
  id:        text('id').primaryKey(),                        // nanoid
  userId:    text('user_id').notNull(),                      // Clerk userId
  keyHash:   text('key_hash').notNull().unique(),            // SHA-256 hex of raw key; raw key never stored
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),  // null = active
}, (t) => ({
  idxUserId: index('idx_api_keys_user_id').on(t.userId),
}))
