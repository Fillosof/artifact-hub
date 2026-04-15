import type { teams, teamMemberships, artifacts, comments, apiKeys } from './schema'

export type Team = typeof teams.$inferSelect
export type TeamMembership = typeof teamMemberships.$inferSelect
export type Artifact = typeof artifacts.$inferSelect
export type Comment = typeof comments.$inferSelect
export type ApiKey = typeof apiKeys.$inferSelect

export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'TEAM_ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'FILE_TOO_LARGE'
  | 'ENRICHMENT_FAILED'
  | 'INTERNAL_ERROR'

export interface ApiError {
  error: string
  code: ErrorCode
  detail?: string
}
