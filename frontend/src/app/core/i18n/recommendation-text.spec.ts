import { noResultText, reasonsText, reasonText } from './recommendation-text'

describe('recommendation reasons', () => {
    it('words each code in the page language, as the API does in English', () => {
        expect(reasonText({ code: 'owned_by', values: { owners: 2, attendees: 3, people: 1 } })).toBe('Owned by 2 of 3 selected people')
        expect(reasonText({ code: 'owned_by', values: { owners: 1, attendees: 4, people: 0 } })).toBe('Owned by 1 of 4 selected attendees')
        expect(reasonText({ code: 'fits_players', values: { players: 5 } })).toBe('Fits 5 players')
        expect(reasonText({ code: 'rating', values: { rating: 7.5 } })).toBe('Selected-attendee rating: 7.5/10')
        expect(reasonText({ code: 'interested', values: { count: 1 } })).toBe('1 selected attendee marked this as interesting')
        expect(reasonText({ code: 'passed_before', values: { count: 2 } })).toBe('2 selected participants passed on this before')
        expect(noResultText({ code: 'no_duration_fit', values: { players: 4, minutes: 30 } })).toBe(
            'No games for 4 players fit within 30 minutes.',
        )
    })

    it("keeps the API's English when it sent no codes or one this app does not know", () => {
        expect(reasonsText(['Owned by 2 of 3 selected people'], undefined)).toEqual(['Owned by 2 of 3 selected people'])
        expect(reasonsText(['Something new'], [{ code: 'from_the_future' }])).toEqual(['Something new'])
        expect(noResultText({ code: 'from_the_future' })).toBeNull()
    })
})
