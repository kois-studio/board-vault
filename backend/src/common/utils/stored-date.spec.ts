import { parseStoredDate, toIsoDate } from './stored-date.js'

describe('stored session dates', () => {
    it('reads every stored shape as the same kind of instant', () => {
        // The app's ISO, a seed script's offset, and SQLite's CURRENT_TIMESTAMP for 18:00 UTC.
        expect(toIsoDate('2026-10-08T18:00:00.000Z')).toBe('2026-10-08T18:00:00.000Z')
        expect(toIsoDate('2026-10-08T20:00:00+02:00')).toBe('2026-10-08T18:00:00.000Z')
        expect(toIsoDate('2026-10-08 18:00:00')).toBe('2026-10-08T18:00:00.000Z')
    })

    it('reads a zoneless value as UTC, whatever the server time zone', () => {
        expect(parseStoredDate('2026-10-08 18:00:00')).toBe(Date.UTC(2026, 9, 8, 18, 0, 0))
        expect(parseStoredDate('2026-10-08T18:00')).toBe(Date.UTC(2026, 9, 8, 18, 0, 0))
        expect(parseStoredDate('2026-10-08 18:00:00.250')).toBe(Date.UTC(2026, 9, 8, 18, 0, 0, 250))
        expect(parseStoredDate('2026-10-08')).toBe(Date.UTC(2026, 9, 8))
        expect(parseStoredDate(' 2026-10-08 18:00:00 ')).toBe(Date.UTC(2026, 9, 8, 18, 0, 0))
    })

    it('orders mixed shapes by instant, not by text', () => {
        const stored = ['2026-10-08 19:00:00', '2026-10-08T18:30:00.000Z', '2026-10-08T21:00:00+02:00']

        expect([...stored].sort((a, b) => parseStoredDate(a) - parseStoredDate(b)).map(toIsoDate)).toEqual([
            '2026-10-08T18:30:00.000Z',
            '2026-10-08T19:00:00.000Z',
            '2026-10-08T19:00:00.000Z',
        ])
    })

    it('leaves text that is not a date as it is', () => {
        expect(Number.isNaN(parseStoredDate('soon'))).toBe(true)
        expect(toIsoDate('soon')).toBe('soon')
        expect(toIsoDate('')).toBe('')
    })
})
