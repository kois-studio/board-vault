import { formatAttendeeSummary } from '../../core/utils/formatAttendeeSummary'
import { GroupViewComponent, shouldShowFirstGroupSetup } from './group-view.component'

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

describe('shouldShowFirstGroupSetup', () => {
    const emptyGroup = {
        memberCount: 1,
        gameCount: 0,
        historyCount: 0,
        hasUpcomingSession: false,
        historyLoading: false,
        historyError: false,
    }

    it('shows the invite, add-games, and first-session handoff for a new empty group', () => {
        expect(shouldShowFirstGroupSetup(emptyGroup)).toBe(true)
    })

    it('does not show onboarding while history is unresolved or after the group has activity', () => {
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, historyLoading: true })).toBe(false)
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, memberCount: 2 })).toBe(false)
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, gameCount: 1 })).toBe(false)
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, hasUpcomingSession: true })).toBe(false)
    })
})

describe('group participant history presentation', () => {
    it('includes placeholder attendees and players in the same summaries as account members', () => {
        const component = Object.create(GroupViewComponent.prototype) as GroupViewComponent
        const ana = { id: 9, displayName: 'Ana', avatar: null, accountId: null }
        expect(component.getAttendeeSummary([{ id: 4, displayName: 'Carlos', username: 'carlos' } as never], [ana])).toBe(
            'With Ana, Carlos',
        )
    })

    it('lists a member once when a session records both their account and their group person', () => {
        const component = Object.create(GroupViewComponent.prototype) as GroupViewComponent
        const carlosAccount = { id: 4, displayName: 'Carlos', username: 'carlos' } as never
        const carlosPerson = { id: 2, displayName: 'Carlos G.', avatar: null, accountId: 4 }

        expect(component.getAttendeeSummary([carlosAccount], [carlosPerson])).toBe('With Carlos G.')
        expect(
            component.getPlayerCount({
                gameData: {} as never,
                playedBy: [carlosAccount],
                playedByPeople: [carlosPerson],
                winnerAccountIds: [],
                winnerPersonIds: [],
            }),
        ).toBe(1)
    })

    it('names the winners of a played game', () => {
        const component = Object.create(GroupViewComponent.prototype) as GroupViewComponent
        const ana = { id: 9, displayName: 'Ana', avatar: null, accountId: null }
        const carlos = { id: 2, displayName: 'Carlos', avatar: null, accountId: 4 }

        expect(
            component.getWinners({
                gameData: {} as never,
                playedBy: [],
                playedByPeople: [ana, carlos],
                winnerAccountIds: [4],
                winnerPersonIds: [9],
            }),
        ).toBe('Ana and Carlos won')
        expect(component.getWinners({ gameData: {} as never, playedBy: [], playedByPeople: [ana] })).toBe('')
    })
})

describe('group standings presentation', () => {
    it('summarises wins, games and nights with singular forms', () => {
        const component = Object.create(GroupViewComponent.prototype) as GroupViewComponent
        const standing = { accountId: 1, groupPersonId: 4, displayName: 'Ana', avatar: null, sessions: 1, gamesPlayed: 3, wins: 1 }

        expect(component.standingSummary(standing)).toBe('1 win · 3 games · 1 night')
        expect(component.standingSummary({ ...standing, wins: 0, gamesPlayed: 1, sessions: 2 })).toBe('0 wins · 1 game · 2 nights')
    })

    it('falls back to initials for people without an avatar', () => {
        const component = Object.create(GroupViewComponent.prototype) as GroupViewComponent

        expect(component.initialsAvatar('ana belén')).toEqual(expect.objectContaining({ type: 'initials', initials: 'AB' }))
    })
})
