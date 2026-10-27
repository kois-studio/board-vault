import type { NotificationType } from '../../api/api.types'
import { listGames, notificationText } from './notification-text'

const context = {
    accounts: [
        { id: 3, name: 'Paula', deleted: false },
        { id: 4, name: null, deleted: true },
    ],
    groups: [{ id: 10, name: 'Fridays' }],
    sessions: [{ id: 41, date: '2026-10-09T17:00:00.000Z', timezone: 'Europe/Madrid' }],
    people: [{ id: 7, name: 'Leo' }],
    games: [
        { id: 101, title: 'Catan', titleLanguage: 'en' },
        { id: 102, title: 'Azul', titleLanguage: 'en' },
        { id: 103, title: 'Root', titleLanguage: 'en' },
    ],
}
const notification = (type: string, data: Record<string, unknown>, withContext = true): NotificationType => ({
    id: 1,
    accountId: 2,
    type,
    message: 'Stored English',
    createdAt: '2026-10-09T10:00:00.000Z',
    isRead: false,
    data,
    ...(withContext ? { context } : {}),
})

describe('notificationText', () => {
    it('words a game night from its data, with the date in its time zone', () => {
        expect(notificationText(notification('meeting_scheduled', { account: 3, meeting: 41, group: 10 }))).toBe(
            'Paula planned a game night in Fridays for Fri 9 Oct, 19:00. Can you make it?',
        )
        expect(notificationText(notification('session_finished', { account: 3, meeting: 41, group: 10 }))).toBe(
            'The Fridays game night of Fri 9 Oct, 19:00 is finished. Rate what you played.',
        )
    })

    it('says who left and who removed them', () => {
        expect(notificationText(notification('user_left_group', { account: 3, member: 3, group: 10 }))).toBe('Paula left Fridays.')
        expect(notificationText(notification('user_left_group', { account: 3, member: 4, group: 10 }))).toBe(
            'Paula removed Deleted account from Fridays.',
        )
    })

    it('lists shelf changes', () => {
        expect(notificationText(notification('shelf_changed', { account: 3, group: 10, added: [101], removed: [] }))).toBe(
            'Paula added Catan to their shelf.',
        )
        expect(notificationText(notification('shelf_changed', { account: 3, group: 10, added: [101], removed: [102, 103] }))).toBe(
            'Paula added Catan to their shelf and removed Azul and Root.',
        )
    })

    it('counts games beyond two, and games it has no title for', () => {
        const titles = new Map(context.games.map((game) => [game.id, game.title]))
        expect(listGames([101, 102, 103], titles)).toBe('Catan, Azul and Root')
        expect(listGames([101, 102, 103, 104, 105], titles)).toBe('Catan, Azul and 3 other games')
        expect(listGames([101, 999], titles)).toBe('Catan and one other game')
        expect(listGames([998, 999], titles)).toBe('2 games')
    })

    it('words a change to a group person', () => {
        expect(
            notificationText(notification('group_person_changed', { account: 3, group: 10, person: 7, game: 101, change: 'owned' })),
        ).toBe('Paula said Leo has Catan, in Fridays.')
    })

    it('shows the stored message without what a sentence needs', () => {
        expect(notificationText(notification('meeting_scheduled', { account: 3, meeting: 41, group: 10 }, false))).toBe('Stored English')
        expect(notificationText(notification('meeting_scheduled', { account: 3, meeting: 99, group: 10 }))).toBe('Stored English')
        expect(notificationText(notification('group_person_changed', { account: 3, group: 10, person: 7, game: 101 }))).toBe(
            'Stored English',
        )
        expect(notificationText(notification('invitation_accepted', {}))).toBe('Stored English')
    })

    it('words proposal outcomes', () => {
        expect(
            notificationText(
                notification('game_proposal_rejected', { gameTitle: 'Azul 2', proposalId: 1, reviewNotes: 'Too close to Azul' }),
            ),
        ).toBe('Your game proposal "Azul 2" was rejected: Too close to Azul')
    })
})
