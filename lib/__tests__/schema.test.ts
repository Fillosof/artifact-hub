import { describe, it, expect, assertType } from 'vitest'
import {
  teams,
  teamMemberships,
  teamInvitations,
  artifacts,
  artifactTags,
  comments,
  apiKeys,
} from '../schema'

describe('schema type inference', () => {
  it('teams.$inferSelect has expected shape with string id', () => {
    type TeamRow = typeof teams.$inferSelect
    assertType<TeamRow>({
      id: '',
      name: '',
      slug: '',
      createdBy: '',
      createdAt: new Date(),
    })
  })

  it('artifacts.$inferSelect has expected shape with string id and union enrichmentStatus', () => {
    type ArtifactRow = typeof artifacts.$inferSelect
    assertType<ArtifactRow>({
      id: '',
      teamId: '',
      title: '',
      fileUrl: '',
      fileName: '',
      fileType: '',
      sourceUrl: null,
      summary: null,
      enrichmentStatus: 'pending',
      createdBy: '',
      createdAt: new Date(),
    })
  })

  it('apiKeys.$inferSelect has expected shape with string id', () => {
    type ApiKeyRow = typeof apiKeys.$inferSelect
    assertType<ApiKeyRow>({
      id: '',
      userId: '',
      keyHash: '',
      createdAt: new Date(),
      revokedAt: null,
    })
  })

  it('all ID columns are typed as string (not number)', () => {
    type TeamId = typeof teams.$inferSelect['id']
    type ArtifactId = typeof artifacts.$inferSelect['id']
    type MembershipId = typeof teamMemberships.$inferSelect['id']
    type InvitationId = typeof teamInvitations.$inferSelect['id']
    type CommentId = typeof comments.$inferSelect['id']
    type ApiKeyId = typeof apiKeys.$inferSelect['id']

    assertType<string>('' as TeamId)
    assertType<string>('' as ArtifactId)
    assertType<string>('' as MembershipId)
    assertType<string>('' as InvitationId)
    assertType<string>('' as CommentId)
    assertType<string>('' as ApiKeyId)
  })

  it('enrichmentStatus is narrowed to the correct union type', () => {
    type Status = typeof artifacts.$inferSelect['enrichmentStatus']
    assertType<'pending' | 'complete' | 'failed'>('pending' as Status)
  })

  it('teamMemberships role is narrowed to the correct union type', () => {
    type Role = typeof teamMemberships.$inferSelect['role']
    assertType<'member' | 'admin'>('member' as Role)
  })

  it('teamInvitations role and status are narrowed to expected unions', () => {
    type Role = typeof teamInvitations.$inferSelect['role']
    type Status = typeof teamInvitations.$inferSelect['status']

    assertType<'member' | 'admin'>('member' as Role)
    assertType<'pending' | 'accepted'>('pending' as Status)
  })

  it('artifactTags has no surrogate id column — only artifactId and tag', () => {
    type TagRow = typeof artifactTags.$inferSelect
    const row: TagRow = { artifactId: 'a', tag: 'b' }
    expect(Object.keys(row)).toEqual(['artifactId', 'tag'])
  })

  it('teams.$inferInsert shape matches columns', () => {
    type NewTeam = typeof teams.$inferInsert
    assertType<NewTeam>({
      id: 'abc',
      name: 'Acme',
      slug: 'acme',
      createdBy: 'user_123',
      createdAt: new Date(),
    })
  })
})
