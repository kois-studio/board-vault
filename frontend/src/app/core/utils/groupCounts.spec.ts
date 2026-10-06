import { groupGameCount, groupPeopleCount } from './groupCounts'

describe('group counts', () => {
    const member = (...gameIds: Array<number>) => ({ games: gameIds.map((id) => ({ id })) })

    it('counts members and people without an account', () => {
        expect(groupPeopleCount({ members: [member(), member()], placeholders: [{ gameIds: [] }] })).toBe(3)
        expect(groupPeopleCount({ members: [member()] })).toBe(1)
    })

    it('counts each game once, whoever owns it, with or without an account', () => {
        // Bloody's six games, Nora's two and Pablo's three, as in a private group with two people without an account.
        const group = {
            members: [member(1, 2, 3, 4, 5, 6)],
            placeholders: [{ gameIds: [7, 8] }, { gameIds: [9, 10, 11] }],
        }

        expect(groupGameCount(group)).toBe(11)
        expect(groupGameCount({ members: [member(1, 2), member(2, 3)], placeholders: [{ gameIds: [3, 4] }] })).toBe(4)
        expect(groupGameCount({ members: [] })).toBe(0)
    })
})
