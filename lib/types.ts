import type {
  teams,
  teamMemberships,
  teamInvitations,
  artifacts,
  comments,
  apiKeys,
} from './schema'

export type Team = typeof teams.$inferSelect
export type TeamMembership = typeof teamMemberships.$inferSelect
export type TeamInvitation = typeof teamInvitations.$inferSelect
export type TeamInvitationInsert = typeof teamInvitations.$inferInsert
export type Artifact = typeof artifacts.$inferSelect
export type Comment = typeof comments.$inferSelect
export type ApiKey = typeof apiKeys.$inferSelect

export interface TeamMember {
  id: string
  userId: string
  role: 'member' | 'admin'
  joinedAt: number
  displayName?: string
}

export interface PendingInvitation {
  id: string
  teamId: string
  email: string
  role: 'member' | 'admin'
  status: 'pending' | 'accepted'
  invitedBy: string
  createdAt: number
  expiresAt: number | null
  acceptedAt: number | null
}

export interface AcceptInvitationRequest {
  invitationId: string
}

export interface AcceptInvitationResponse {
  success: boolean
  teamId: string
  teamName: string
}

export interface DeclineInvitationRequest {
  invitationId: string
}

export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'TEAM_ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INVALID_INVITE'
  | 'VALIDATION_ERROR'
  | 'FILE_TOO_LARGE'
  | 'ENRICHMENT_FAILED'
  | 'INTERNAL_ERROR'

export interface ApiError {
  error: string
  code: ErrorCode
  detail?: string
}
