import type { PublicUserType } from '../../api/api.types'

/** People without an account or avatar show their initials. */
export function initialsAvatar(name: string): PublicUserType['avatar'] {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    return { type: 'initials', initials, backgroundColor: '#64748b', iconName: null, emoji: null }
}
