import type { MeetType } from '../../api/api.types'

/** Calendar entries last this long; sessions have no end time. */
const EVENT_LENGTH_MS = 3 * 60 * 60 * 1000
const SITE_URL = 'https://board-vault.com'

export type CalendarSession = Pick<MeetType, 'id' | 'meetDate' | 'notes'>

type CalendarEvent = { title: string; start: Date; end: Date; description: string; url: string }

function toEvent(session: CalendarSession, groupName: string): CalendarEvent {
    const start = new Date(session.meetDate)
    const url = `${SITE_URL}/sessions/${session.id}`
    const description = [session.notes?.trim(), `Session in Board Vault: ${url}`].filter(Boolean).join('\n\n')
    return { title: `Game night · ${groupName}`, start, end: new Date(start.getTime() + EVENT_LENGTH_MS), description, url }
}

/** 2026-09-04T19:00:00.000Z → 20260904T190000Z */
function utcStamp(date: Date): string {
    return date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '')
}

/** Escapes a TEXT value (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Folds a content line at 75 octets, never splitting a UTF-8 character (RFC 5545 §3.1). */
function foldLine(line: string): string {
    const encoder = new TextEncoder()
    const parts: Array<string> = []
    let current = ''
    let currentBytes = 0
    for (const char of line) {
        const bytes = encoder.encode(char).length
        // Continuation lines start with a space, which counts toward their 75 octets.
        const limit = parts.length === 0 ? 75 : 74
        if (currentBytes + bytes > limit) {
            parts.push(current)
            current = ''
            currentBytes = 0
        }
        current += char
        currentBytes += bytes
    }
    parts.push(current)
    return parts.join('\r\n ')
}

/** An iCalendar file with one event, for Apple Calendar, Outlook and others. */
export function buildSessionIcs(session: CalendarSession, groupName: string, now = new Date()): string {
    const event = toEvent(session, groupName)
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Board Vault//Sessions//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:meet-${session.id}@board-vault.com`,
        `DTSTAMP:${utcStamp(now)}`,
        `DTSTART:${utcStamp(event.start)}`,
        `DTEND:${utcStamp(event.end)}`,
        `SUMMARY:${escapeText(event.title)}`,
        `DESCRIPTION:${escapeText(event.description)}`,
        `URL:${event.url}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ]
    return `${lines.map(foldLine).join('\r\n')}\r\n`
}

/** A link that opens Google Calendar with the event filled in. */
export function googleCalendarUrl(session: CalendarSession, groupName: string): string {
    const event = toEvent(session, groupName)
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${utcStamp(event.start)}/${utcStamp(event.end)}`,
        details: event.description,
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Saves the session as an .ics file through a temporary link. */
export function downloadSessionIcs(session: CalendarSession, groupName: string): void {
    const blob = new Blob([buildSessionIcs(session, groupName)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `game-night-${session.id}.ics`
    link.click()
    URL.revokeObjectURL(url)
}
