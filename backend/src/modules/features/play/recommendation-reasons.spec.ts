import { englishNoResultReason, englishReason } from './recommendation-reasons.js'

describe('recommendation reasons in English', () => {
    it('words each code as the API always has', () => {
        expect(englishReason({ code: 'owned_by', values: { owners: 2, attendees: 5, people: 0 } })).toBe(
            'Owned by 2 of 5 selected attendees',
        )
        expect(englishReason({ code: 'rating', values: { rating: 8 } })).toBe('Selected-attendee rating: 8.0/10')
        expect(englishReason({ code: 'interested', values: { count: 1 } })).toBe('1 selected attendee marked this as interesting')
        expect(englishReason({ code: 'passed_before', values: { count: 3 } })).toBe('3 selected participants passed on this before')
        expect(englishNoResultReason({ code: 'no_duration_fit', values: { players: 4, minutes: 30 } })).toBe(
            'No games for 4 players fit within 30 minutes.',
        )
    })
})
