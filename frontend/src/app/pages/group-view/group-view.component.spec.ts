import { formatAttendeeSummary } from '../../core/utils/formatAttendeeSummary'

describe('formatAttendeeSummary', () => {
    it('uses an honest fallback when no attendance was recorded', () => {
        expect(formatAttendeeSummary([])).toBe('Attendance not recorded')
    })

    it('keeps a short attendee list readable and summarizes longer lists', () => {
        const attendees = [
            { displayName: 'Ana', username: 'ana' },
            { displayName: '', username: 'bo' },
            { displayName: 'Cris', username: 'cris' },
            { displayName: 'Dani', username: 'dani' },
        ]

        expect(formatAttendeeSummary(attendees.slice(0, 2))).toBe('With Ana, bo')
        expect(formatAttendeeSummary(attendees)).toBe('With Ana, bo, Cris + 1 more')
    })
})
