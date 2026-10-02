import type { MeetType } from '../../api/api.types'

/** A planned night counts as over this long after it starts. */
const SESSION_LENGTH_MS = 12 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Where a scheduled or active session stands: `live` while it is running,
 * `planned` until it starts, and `wrap-up` once the night is over but nobody
 * has recorded what was played. Completed and cancelled sessions return null.
 */
export type UpcomingState = 'live' | 'planned' | 'wrap-up'

export function upcomingState(meet: Pick<MeetType, 'status' | 'meetDate'>, now = Date.now()): UpcomingState | null {
    if (meet.status === 'active') return 'live'
    if (meet.status !== 'scheduled') return null
    return new Date(meet.meetDate).getTime() + SESSION_LENGTH_MS < now ? 'wrap-up' : 'planned'
}

export type SessionDateParts = { month: string; day: string; weekday: string; time: string; year: string }

/** Calendar parts in the session's own timezone, for date blocks. */
export function sessionDateParts(meet: Pick<MeetType, 'meetDate' | 'timezone'>): SessionDateParts {
    const date = new Date(meet.meetDate)
    const part = (options: Intl.DateTimeFormatOptions) => {
        try {
            return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: meet.timezone }).format(date)
        } catch {
            return new Intl.DateTimeFormat('en-GB', options).format(date)
        }
    }
    return {
        month: part({ month: 'short' }),
        day: part({ day: 'numeric' }),
        weekday: part({ weekday: 'short' }),
        time: part({ hour: '2-digit', minute: '2-digit', hour12: false }),
        year: part({ year: 'numeric' }),
    }
}

/** "Today", "Tomorrow", "In 5 days", "Yesterday", "3 weeks ago", counted in calendar days. */
export function relativeDay(meetDate: string, now = new Date()): string {
    const startOfDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    const days = Math.round((startOfDay(new Date(meetDate)) - startOfDay(now)) / DAY_MS)

    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days === -1) return 'Yesterday'

    const distance = Math.abs(days)
    const amount =
        distance < 14 ? `${distance} days` : distance < 60 ? `${Math.round(distance / 7)} weeks` : `${Math.round(distance / 30)} months`
    return days > 0 ? `In ${amount}` : `${amount} ago`
}
