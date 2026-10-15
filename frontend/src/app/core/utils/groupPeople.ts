import type { GroupPersonWorkspaceType } from '../../api/api.types'

/**
 * Whether a group person can take part in a new game night or suggestion: not archived, and still in
 * the group. Someone who left keeps an active group person, with standing `left`, so their history
 * stays (ADR-0018); the API refuses them as participants.
 */
export function canTakePart({ person }: Pick<GroupPersonWorkspaceType, 'person'>): boolean {
    return person.status === 'active' && (person.standing ?? 'member') === 'member'
}
