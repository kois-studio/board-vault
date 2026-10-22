import { describeShelfChange, isEmptyShelfChange, mergeShelfChange, namedShelfGames, readShelfChange } from './shelf-notification.js'

const none = { added: [], removed: [] }
const titles = new Map([
    [1, 'Catan'],
    [2, 'Azul'],
    [3, 'Root'],
    [4, 'Wingspan'],
    [5, 'Carcassonne'],
])

describe('shelf notifications', () => {
    describe('mergeShelfChange', () => {
        it('adds what is new, the latest first', () => {
            const once = mergeShelfChange(none, { added: [1], removed: [] })

            expect(mergeShelfChange(once, { added: [2], removed: [] })).toEqual({ added: [2, 1], removed: [] })
        })

        it('drops a game that was added and then removed again, or removed and then added back', () => {
            const added = mergeShelfChange(none, { added: [1], removed: [] })
            const removed = mergeShelfChange(none, { added: [], removed: [1] })

            expect(mergeShelfChange(added, { added: [], removed: [1] })).toEqual(none)
            expect(mergeShelfChange(removed, { added: [1], removed: [] })).toEqual(none)
        })

        it('ends where it started however many times the same game goes on and off', () => {
            let unread = { added: [2], removed: [] as Array<number> }

            for (let round = 0; round < 50; round++) {
                unread = mergeShelfChange(unread, { added: [1], removed: [] })
                unread = mergeShelfChange(unread, { added: [], removed: [1] })
            }

            expect(unread).toEqual({ added: [2], removed: [] })
        })

        it('gives the same result in whichever order two changes arrive', () => {
            const changes = [
                { added: [1], removed: [] },
                { added: [], removed: [1] },
                { added: [], removed: [3] },
            ]
            const forwards = changes.reduce(mergeShelfChange, none)
            const backwards = [...changes].reverse().reduce(mergeShelfChange, none)

            expect(forwards).toEqual({ added: [], removed: [3] })
            expect(backwards).toEqual(forwards)
        })

        it('lists a game once, and leaves what it was given unchanged', () => {
            const unread = { added: [1], removed: [] }

            expect(mergeShelfChange(unread, { added: [1], removed: [] })).toEqual({ added: [1], removed: [] })
            mergeShelfChange(unread, { added: [2], removed: [1] })
            expect(unread).toEqual({ added: [1], removed: [] })
        })
    })

    it('reads a stored change, and starts over from data that is not one', () => {
        expect(readShelfChange({ account: 3, group: 10, added: [1], removed: [2] })).toEqual({ added: [1], removed: [2] })
        expect(readShelfChange({ added: ['1'], removed: [] })).toEqual(none)
        expect(readShelfChange({ added: [1] })).toEqual(none)
        expect(readShelfChange(null)).toEqual(none)
        expect(readShelfChange('{"added":[1]}')).toEqual(none)
    })

    it('knows when nothing is left', () => {
        expect(isEmptyShelfChange(none)).toBe(true)
        expect(isEmptyShelfChange({ added: [], removed: [1] })).toBe(false)
    })

    it('names up to three games in a list, and two followed by a count beyond that', () => {
        expect(namedShelfGames({ added: [1, 2, 3], removed: [4] })).toEqual([1, 2, 3, 4])
        expect(namedShelfGames({ added: [1, 2, 3, 4, 5], removed: [] })).toEqual([1, 2])
    })

    describe('describeShelfChange', () => {
        it('says what was added', () => {
            expect(describeShelfChange('Ana', { added: [1], removed: [] }, titles)).toBe('Ana added Catan to their shelf.')
            expect(describeShelfChange('Ana', { added: [1, 2], removed: [] }, titles)).toBe('Ana added Catan and Azul to their shelf.')
            expect(describeShelfChange('Ana', { added: [1, 2, 3], removed: [] }, titles)).toBe(
                'Ana added Catan, Azul and Root to their shelf.',
            )
            expect(describeShelfChange('Ana', { added: [1, 2, 3, 4, 5], removed: [] }, titles)).toBe(
                'Ana added Catan, Azul and 3 other games to their shelf.',
            )
        })

        it('says what was removed', () => {
            expect(describeShelfChange('Ana', { added: [], removed: [4] }, titles)).toBe('Ana removed Wingspan from their shelf.')
        })

        it('says both in one sentence', () => {
            expect(describeShelfChange('Ana', { added: [1], removed: [4, 5] }, titles)).toBe(
                'Ana added Catan to their shelf and removed Wingspan and Carcassonne.',
            )
        })

        it('still reads well when a title is unknown', () => {
            expect(describeShelfChange('Ana', { added: [99], removed: [] }, titles)).toBe('Ana added a game to their shelf.')
            expect(describeShelfChange('Ana', { added: [99, 98, 97], removed: [] }, titles)).toBe('Ana added 3 games to their shelf.')
            expect(describeShelfChange('Ana', { added: [1, 99], removed: [] }, titles)).toBe(
                'Ana added Catan and one other game to their shelf.',
            )
            expect(describeShelfChange('Ana', { added: [99, 2, 3, 4], removed: [] }, titles)).toBe(
                'Ana added Azul and 3 other games to their shelf.',
            )
        })
    })
})
