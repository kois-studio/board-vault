import { fakeDatabase } from '../../../../test/fake-database.js'

import { ActivityNotifier, formatSessionDate } from './activity-notifier.service.js'

const rows = (values: Array<Array<unknown>>) => ({ rows: values })

function setup(invited: Array<[number, string]> = [], createNotifications = vi.fn().mockResolvedValue({ rowsAffected: 1 })) {
    const database = {
        createNotifications,
        getSessionNotificationContext: vi.fn().mockResolvedValue(rows([[7, 'Thursdays', '2026-10-09T17:00:00.000Z', 'Europe/Madrid']])),
        getSessionInvitedAccounts: vi.fn().mockResolvedValue(rows(invited)),
        getGroupNotificationContext: vi.fn().mockResolvedValue(
            rows([
                ['Thursdays', 1],
                ['Thursdays', 2],
                ['Thursdays', 3],
            ]),
        ),
        getAccountName: vi.fn().mockResolvedValue(rows([['Ana']])),
    }

    return { database, notifier: new ActivityNotifier(fakeDatabase(database)) }
}

const sentTo = (createNotifications: ReturnType<typeof vi.fn>) =>
    (createNotifications.mock.calls[0]?.[0] as Array<{ accountId: number }>).map(notification => notification.accountId)

describe('ActivityNotifier', () => {
    it('tells everyone invited, except the organizer, that a night was planned', async () => {
        const { database, notifier } = setup([
            [1, 'accepted'],
            [2, 'pending'],
            [3, 'pending'],
        ])

        await notifier.sessionPlanned(21, 1)

        expect(sentTo(database.createNotifications)).toEqual([2, 3])
        expect(database.createNotifications.mock.calls[0]?.[0][0]).toEqual({
            accountId: 2,
            type: 'meeting_scheduled',
            message: 'Ana planned a game night in Thursdays for Fri 9 Oct, 19:00. Can you make it?',
            data: { account: 1, meeting: 21, group: 7 },
        })
    })

    it('skips people who declined when a night starts, but tells them when it is cancelled', async () => {
        const invited: Array<[number, string]> = [
            [1, 'accepted'],
            [2, 'declined'],
            [3, 'accepted'],
        ]
        const started = setup(invited)

        await started.notifier.sessionChanged(21, 1, 'active')
        expect(sentTo(started.database.createNotifications)).toEqual([3])
        expect(started.database.createNotifications.mock.calls[0]?.[0][0].type).toBe('session_started')

        const cancelled = setup(invited)

        await cancelled.notifier.sessionChanged(21, 1, 'cancelled')
        expect(sentTo(cancelled.database.createNotifications)).toEqual([2, 3])
        expect(cancelled.database.createNotifications.mock.calls[0]?.[0][0].message).toBe(
            'Ana cancelled the Thursdays game night of Fri 9 Oct, 19:00.',
        )
    })

    it('tells the other members when someone joins', async () => {
        const { database, notifier } = setup()

        await notifier.memberJoined(7, 3)

        expect(sentTo(database.createNotifications)).toEqual([1, 2])
        expect(database.createNotifications.mock.calls[0]?.[0][0]).toMatchObject({
            type: 'user_joined_group',
            message: 'Ana joined Thursdays.',
        })
    })

    it('sends nothing when nobody else is concerned', async () => {
        const { database, notifier } = setup([[1, 'accepted']])

        await notifier.sessionPlanned(21, 1)

        expect(database.createNotifications).not.toHaveBeenCalled()
    })

    it('never fails the request that caused it', async () => {
        const { notifier } = setup([[2, 'pending']], vi.fn().mockRejectedValue(new Error('database down')))

        await expect(notifier.sessionPlanned(21, 1)).resolves.toBeUndefined()
    })

    it('formats the date in the session timezone, and in UTC for an unknown one', () => {
        expect(formatSessionDate('2026-10-09T17:00:00.000Z', 'Europe/Madrid')).toBe('Fri 9 Oct, 19:00')
        expect(formatSessionDate('2026-10-09T17:00:00.000Z', 'Mars/Olympus')).toBe('Fri 9 Oct, 17:00')
    })
})
