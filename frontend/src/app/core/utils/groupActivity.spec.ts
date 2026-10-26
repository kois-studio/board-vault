import type { GroupActivityType } from '../../api/api.types'
import { activityName, describeActivity } from './groupActivity'

const rita = { id: 3, name: 'Rita', standing: 'member' as const }
const pedro = { id: 7, name: 'Pedro', standing: 'member' as const }
const catan = { id: 2, title: 'Catan' }

function entry(type: string, overrides: Partial<GroupActivityType> = {}): GroupActivityType {
    return {
        id: 1,
        type,
        createdAt: '2026-10-16 18:00:00',
        actor: rita,
        meetId: null,
        person: null,
        game: null,
        subject: null,
        data: {},
        accounts: [],
        people: [],
        games: [],
        ...overrides,
    }
}

describe('group history sentences', () => {
    it('names people as they stand now', () => {
        expect(activityName({ id: 1, name: 'Ana', standing: 'left' })).toBe('Ana (left)')
        expect(activityName({ id: 1, name: 'Deleted account', standing: 'deleted' })).toBe('Deleted account')
        expect(activityName(null)).toBe('someone')
    })

    it("says what happened to a group person's games, undo included", () => {
        expect(
            describeActivity(entry('person_game_set', { person: pedro, game: catan, data: { status: 'asserted', previousStatus: null } })),
        ).toBe('Rita said Pedro has Catan')
        expect(
            describeActivity(
                entry('person_game_set', { person: pedro, game: catan, data: { status: 'rejected', previousStatus: 'asserted' } }),
            ),
        ).toBe('Rita removed Catan from Pedro’s games')
        expect(describeActivity(entry('person_preference_set', { person: pedro, game: catan, data: { preference: 'avoid' } }))).toBe(
            'Rita said Pedro would rather not play Catan',
        )
    })

    it('lists games added to and taken off a shortlist', () => {
        const games = [catan, { id: 1, title: 'Azul' }, { id: 5, title: null }]

        expect(describeActivity(entry('session_shortlist_changed', { games, data: { addedGameIds: [2, 1], removedGameIds: [5] } }))).toBe(
            'Rita added Catan and Azul to the shortlist of a game night and took a game off it',
        )
    })

    it('names who won, and who was invited', () => {
        const accounts = [{ id: 4, name: 'Sam', standing: 'left' as const }]

        expect(
            describeActivity(
                entry('session_results_changed', {
                    game: catan,
                    accounts,
                    people: [pedro],
                    data: { winnerAccountIds: [4], winnerPersonIds: [7] },
                }),
            ),
        ).toBe('Rita recorded that Sam (left) and Pedro won Catan')
        expect(describeActivity(entry('session_invites_changed', { accounts, data: { addedAccountIds: [4], removedPersonIds: [] } }))).toBe(
            'Rita invited Sam (left) for a game night',
        )
    })

    it('tells bringing yourself from naming someone else', () => {
        expect(describeActivity(entry('session_bringer_changed', { game: catan, data: { accountId: 3, groupPersonId: null } }))).toBe(
            'Rita will bring Catan to a game night',
        )
        expect(
            describeActivity(
                entry('session_bringer_changed', { game: catan, people: [pedro], data: { accountId: null, groupPersonId: 7 } }),
            ),
        ).toBe('Rita said Pedro will bring Catan to a game night')
        expect(describeActivity(entry('session_bringer_changed', { game: catan, data: { accountId: null, groupPersonId: null } }))).toBe(
            'Rita said nobody is bringing Catan to a game night yet',
        )
    })

    it('still says something for a type it does not know', () => {
        expect(describeActivity(entry('something_new'))).toBe('Rita changed something in the group')
    })
})
