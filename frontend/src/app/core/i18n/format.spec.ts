import { capitalize, formatDateTime, isoDay, pageLocale, relativeDays, timeAgo } from './format'

describe('formatting in the page language', () => {
    it('runs in English outside a localized build', () => {
        expect(pageLocale()).toBe('en')
    })

    it('formats dates with day before month', () => {
        expect(formatDateTime(Date.UTC(2026, 9, 24, 18), { day: 'numeric', month: 'long', year: 'numeric' }, 'UTC')).toBe('24 October 2026')
    })

    it('falls back to the device time zone for an unknown one', () => {
        expect(() => formatDateTime(Date.UTC(2026, 9, 24), { day: 'numeric' }, 'Not/AZone')).not.toThrow()
    })

    it('makes day keys in the session time zone', () => {
        expect(isoDay(Date.UTC(2026, 9, 24, 23, 30), 'Europe/Madrid')).toBe('2026-10-25')
        expect(isoDay(Date.UTC(2026, 9, 24, 23, 30), 'UTC')).toBe('2026-10-24')
    })

    it('says how far a day is', () => {
        expect(relativeDays(0)).toBe('Today')
        expect(relativeDays(1)).toBe('Tomorrow')
        expect(relativeDays(-1)).toBe('Yesterday')
        expect(relativeDays(5)).toBe('In 5 days')
        expect(relativeDays(-21)).toBe('3 weeks ago')
        expect(relativeDays(90)).toBe('In 3 months')
    })

    it('says how long ago something happened', () => {
        const now = Date.UTC(2026, 9, 24, 12)
        expect(timeAgo(now - 10_000, now)).toBe('Just now')
        expect(timeAgo(now - 5 * 60_000, now)).toBe('5 minutes ago')
        expect(timeAgo(now - 3 * 86_400_000, now)).toBe('3 days ago')
        expect(timeAgo(now - 3 * 604_800_000, now)).toBe('3 weeks ago')
    })

    it('capitalizes the first letter only', () => {
        expect(capitalize('in 5 days')).toBe('In 5 days')
    })
})
