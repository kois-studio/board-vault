import type { UserDataKey } from '../../core/services/data.service'

/**
 * The lists Home shows (#263). Named by Home itself, and by the pending screen on the way to Home, so they load as
 * soon as the account is known (#343).
 */
export const HOME_LISTS: ReadonlyArray<UserDataKey> = [
    'games',
    'groups',
    'groupInvitations',
    'history',
    'historySummary',
    'invitations',
    'meets',
]
