import { groupBy } from './group-by.js'

describe('rows listed by key (#289)', () => {
    const reviews = [
        { accountId: 3, gameId: 4 },
        { accountId: 1, gameId: 1 },
        { accountId: 3, gameId: 2 },
        { accountId: 1, gameId: 9 },
    ]

    it('lists each key once, in the order it first appears, and its rows in the order they came', () => {
        const byAccount = groupBy(reviews, review => review.accountId)

        expect([...byAccount.keys()]).toEqual([3, 1])
        expect(byAccount.get(3)).toEqual([reviews[0], reviews[2]])
        expect(byAccount.get(1)).toEqual([reviews[1], reviews[3]])
    })

    it('keeps only the value asked for', () => {
        expect(
            groupBy(
                reviews,
                review => review.accountId,
                review => review.gameId,
            ),
        ).toEqual(
            new Map([
                [3, [4, 2]],
                [1, [1, 9]],
            ]),
        )
    })

    it('has nothing for no rows, and no list for a key that has none', () => {
        expect(groupBy([], (review: { accountId: number }) => review.accountId).size).toBe(0)
        expect(groupBy(reviews, review => review.accountId).get(2)).toBeUndefined()
    })
})
