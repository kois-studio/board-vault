import { summariseNight } from './nightSummary'

describe('summariseNight', () => {
    const base = {
        attendeeStatuses: [
            { accountId: 1, rsvpStatus: 'accepted' as const, attendanceStatus: 'unknown' as const },
            { accountId: 2, rsvpStatus: 'pending' as const, attendanceStatus: 'unknown' as const },
            { accountId: 3, rsvpStatus: 'declined' as const, attendanceStatus: 'unknown' as const },
            { accountId: 4, rsvpStatus: 'accepted' as const, attendanceStatus: 'unknown' as const },
        ],
        participants: [],
        participantStatuses: [],
        plannedGames: [10, 20, 30],
        gameVotes: [
            { gameId: 20, accountIds: [1, 4] },
            { gameId: 30, accountIds: [1, 4] },
            { gameId: 10, accountIds: [1] },
        ],
    }

    it('counts accounts going and waiting', () => {
        const summary = summariseNight(base)

        expect(summary.going).toBe(2)
        expect(summary.waiting).toBe(1)
    })

    it('puts the most-voted games first and keeps the order games were added on a tie', () => {
        expect(summariseNight(base).shortlist).toEqual([
            { gameId: 20, votes: 2 },
            { gameId: 30, votes: 2 },
            { gameId: 10, votes: 1 },
        ])
    })

    it('counts group people on a night of group people, who never answer themselves', () => {
        const summary = summariseNight({
            ...base,
            participants: [7, 8, 9],
            participantStatuses: [
                { groupPersonId: 7, rsvpStatus: 'accepted', attendanceStatus: 'unknown' },
                { groupPersonId: 8, rsvpStatus: 'pending', attendanceStatus: 'unknown' },
            ],
        })

        expect(summary.going).toBe(1)
        expect(summary.waiting).toBe(0)
    })
})
