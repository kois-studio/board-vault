import type { PublicUserType } from '../../api/api.types'

export function formatAttendeeSummary(attendees: Array<Pick<PublicUserType, 'displayName' | 'username'>>): string {
    const names = attendees.map((member) => member.displayName || member.username)
    if (names.length === 0) return 'Attendance not recorded'
    if (names.length <= 3) return `With ${names.join(', ')}`
    return `With ${names.slice(0, 3).join(', ')} + ${names.length - 3} more`
}
