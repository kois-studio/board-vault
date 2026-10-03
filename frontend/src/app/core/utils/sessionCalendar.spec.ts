import { buildSessionIcs, googleCalendarUrl } from './sessionCalendar'

describe('sessionCalendar', () => {
    const session = { id: 42, meetDate: '2026-09-04T19:00:00.000Z', notes: null }
    const now = new Date('2026-09-01T10:30:00.000Z')

    it('builds a one-event calendar in UTC with a three-hour slot', () => {
        const ics = buildSessionIcs(session, 'Friday crew', now)

        expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
        expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
        expect(ics).toContain('\r\nUID:meet-42@board-vault.com\r\n')
        expect(ics).toContain('\r\nDTSTAMP:20260901T103000Z\r\n')
        expect(ics).toContain('\r\nDTSTART:20260904T190000Z\r\n')
        expect(ics).toContain('\r\nDTEND:20260904T220000Z\r\n')
        expect(ics).toContain('\r\nSUMMARY:Game night · Friday crew\r\n')
        expect(ics).toContain('\r\nURL:https://board-vault.com/sessions/42\r\n')
    })

    it('escapes commas, semicolons, backslashes and new lines', () => {
        const ics = buildSessionIcs({ ...session, notes: 'Bring snacks; drinks, too\\maybe\nSee you' }, 'A, B', now)

        expect(ics).toContain('SUMMARY:Game night · A\\, B')
        expect(ics).toContain('DESCRIPTION:Bring snacks\\; drinks\\, too\\\\maybe\\nSee you\\n\\nSession in')
    })

    it('folds long lines at 75 octets without splitting characters', () => {
        const ics = buildSessionIcs({ ...session, notes: 'é'.repeat(100) }, 'Crew', now)
        const encoder = new TextEncoder()

        for (const line of ics.split('\r\n')) {
            expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
        }
        const unfolded = ics.replace(/\r\n /g, '')
        expect(unfolded).toContain(`DESCRIPTION:${'é'.repeat(100)}\\n\\nSession in Board Vault: https://board-vault.com/sessions/42`)
    })

    it('fills a Google Calendar template link', () => {
        const url = new URL(googleCalendarUrl(session, 'Friday crew'))

        expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
        expect(url.searchParams.get('action')).toBe('TEMPLATE')
        expect(url.searchParams.get('text')).toBe('Game night · Friday crew')
        expect(url.searchParams.get('dates')).toBe('20260904T190000Z/20260904T220000Z')
        expect(url.searchParams.get('details')).toBe('Session in Board Vault: https://board-vault.com/sessions/42')
    })
})
