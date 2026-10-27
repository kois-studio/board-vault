import { contextFor, mergeRefs, notificationRefs } from './notification-context.js'

describe('notification context', () => {
    it('finds what each kind of notification points at', () => {
        expect(notificationRefs({ data: { account: 3, group: 10, added: [101, 102], removed: [103] } as never })).toEqual({
            accounts: [3],
            groups: [10],
            sessions: [],
            people: [],
            games: [101, 102, 103],
        })
        expect(notificationRefs({ data: { account: 2, group: 10, member: 4 } as never }).accounts).toEqual([2, 4])
        expect(notificationRefs({ data: { account: 2, meeting: 41, group: 10 } as never }).sessions).toEqual([41])
        expect(notificationRefs({ data: { account: 2, group: 10, person: 7, game: 101, change: 'owned' } as never })).toMatchObject({
            people: [7],
            games: [101],
        })
        expect(notificationRefs({ data: { gameTitle: 'Azul', proposalId: 1, submittedBy: 5 } as never }).accounts).toEqual([5])
    })

    it('reads each id once across an inbox and hands each notification its own part', () => {
        const refs = [
            notificationRefs({ data: { account: 3, group: 10 } as never }),
            notificationRefs({ data: { account: 3, group: 20 } as never }),
        ]
        const merged = mergeRefs(refs)

        expect(merged.accounts).toEqual([3])
        expect(merged.groups).toEqual([10, 20])

        const found = {
            accounts: [{ id: 3, name: 'Paula', deleted: false }],
            groups: [
                { id: 10, name: 'Fridays' },
                { id: 20, name: 'Sundays' },
            ],
            sessions: [],
            people: [],
            games: [],
        }

        expect(contextFor(refs[1]!, found).groups).toEqual([{ id: 20, name: 'Sundays' }])
    })
})
