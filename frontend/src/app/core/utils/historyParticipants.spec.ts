import type { PublicUserType } from '../../api/api.types'
import { formatWinners, historyWinnerNames, mergeHistoryParticipants } from './historyParticipants'

const avatar = (emoji: string): PublicUserType['avatar'] => ({
    backgroundColor: '#000000',
    iconName: null,
    emoji,
    type: 'emoji',
    initials: '',
})
const bloody: PublicUserType = { id: 6, username: 'Bloody', displayName: 'Bloody', avatar: avatar('😎') }
const david: PublicUserType = { id: 1, username: 'dawichi', displayName: 'David M. Fajardo', avatar: avatar('🚀') }

describe('mergeHistoryParticipants', () => {
    it('lists people recorded only as group people', () => {
        const people = [
            { id: 3, displayName: 'bloddsword', avatar: avatar('😎'), accountId: 6 },
            { id: 9, displayName: 'Guest', avatar: null, accountId: null },
        ]

        expect(mergeHistoryParticipants([], people)).toEqual([
            {
                key: 'account:6',
                accountId: 6,
                personId: 3,
                displayName: 'bloddsword',
                username: 'bloddsword',
                avatar: avatar('😎'),
                standing: 'member',
            },
            { key: 'person:9', accountId: null, personId: 9, displayName: 'Guest', username: 'Guest', avatar: null, standing: 'member' },
        ])
    })

    it('keeps people who left or deleted their account, so a night still has everyone who played (ADR-0018)', () => {
        const people = [
            { id: 1, displayName: 'Carlos', avatar: null, accountId: 1, standing: 'member' as const },
            { id: 2, displayName: 'Deleted account', avatar: null, accountId: 2, standing: 'deleted' as const },
            { id: 3, displayName: 'Jose', avatar: null, accountId: 3, standing: 'left' as const },
        ]

        const participants = mergeHistoryParticipants([], people)

        expect(participants.map((participant) => [participant.displayName, participant.standing])).toEqual([
            ['Carlos', 'member'],
            ['Deleted account', 'deleted'],
            ['Jose (left)', 'left'],
        ])
        expect(formatWinners(historyWinnerNames({ playedBy: [], playedByPeople: people, winnerPersonIds: [2, 3] }))).toBe(
            'Deleted account and Jose (left) won',
        )
    })

    it('counts a person once when the session lists both the account and the linked group person', () => {
        const people = [
            { id: 1, displayName: 'David M. Fajardo', avatar: null, accountId: 1 },
            { id: 3, displayName: 'bloddsword', avatar: null, accountId: 6 },
        ]

        const participants = mergeHistoryParticipants([david, bloody], people)

        expect(participants.map((participant) => participant.key)).toEqual(['account:1', 'account:6'])
        expect(participants[1]).toMatchObject({ displayName: 'bloddsword', username: 'Bloody', avatar: avatar('😎') })
    })

    it('falls back to the group people alone when the API does not say which account each one is', () => {
        const legacyPeople = [
            { id: 1, displayName: 'David M. Fajardo', avatar: null },
            { id: 3, displayName: 'bloddsword', avatar: null },
        ]

        expect(mergeHistoryParticipants([david, bloody], legacyPeople).map((p) => p.displayName)).toEqual([
            'David M. Fajardo',
            'bloddsword',
        ])
    })

    it('keeps accounts that no listed group person is linked to', () => {
        expect(
            mergeHistoryParticipants([david, bloody], [{ id: 3, displayName: 'bloddsword', avatar: null, accountId: 6 }]).map((p) => p.key),
        ).toEqual(['account:6', 'account:1'])
        expect(mergeHistoryParticipants([david]).map((p) => p.displayName)).toEqual(['David M. Fajardo'])
    })
})

describe('historyWinnerNames', () => {
    const people = [
        { id: 3, displayName: 'bloddsword', avatar: null, accountId: 6 },
        { id: 9, displayName: 'Guest', avatar: null, accountId: null },
    ]

    it('names winners recorded as group people or as accounts', () => {
        expect(historyWinnerNames({ playedBy: [], playedByPeople: people, winnerAccountIds: [], winnerPersonIds: [9] })).toEqual(['Guest'])
        expect(historyWinnerNames({ playedBy: [bloody, david], winnerAccountIds: [1], winnerPersonIds: [] })).toEqual(['David M. Fajardo'])
        expect(historyWinnerNames({ playedBy: [bloody], playedByPeople: people, winnerAccountIds: [6], winnerPersonIds: [] })).toEqual([
            'bloddsword',
        ])
    })

    it('is empty when nobody won', () => {
        expect(historyWinnerNames({ playedBy: [bloody], playedByPeople: people, winnerAccountIds: [], winnerPersonIds: [] })).toEqual([])
    })
})

describe('formatWinners', () => {
    it('joins names naturally', () => {
        expect(formatWinners([])).toBe('')
        expect(formatWinners(['Ana'])).toBe('Ana won')
        expect(formatWinners(['Ana', 'Bo'])).toBe('Ana and Bo won')
        expect(formatWinners(['Ana', 'Bo', 'Cy'])).toBe('Ana, Bo and Cy won')
    })
})
