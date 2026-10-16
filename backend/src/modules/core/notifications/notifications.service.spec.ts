import { fakeDatabase } from '../../../../test/fake-database.js'

import { NotificationsService } from './notifications.service.js'

const notificationRows = [[1, 7, 'meeting_scheduled', 'message', '{"account":8,"group":12,"meeting":21}', '2026-08-14 00:00:00', 0]]

describe('NotificationsService ownership', () => {
    it('returns an owned notification and forwards the account boundary', async () => {
        const getNotificationById = vi.fn().mockResolvedValue({ rows: notificationRows })
        const service = new NotificationsService(fakeDatabase({ getNotificationById }))

        await expect(service.getNotificationById(1, 7)).resolves.toMatchObject({
            id: 1,
            accountId: 7,
            data: { account: 8, group: 12, meeting: 21 },
        })
        expect(getNotificationById).toHaveBeenCalledWith(1, 7)
    })

    it('returns only the account notification data shape', async () => {
        const getNotificationsByAccountId = vi.fn().mockResolvedValue({ rows: notificationRows })
        const service = new NotificationsService(fakeDatabase({ getNotificationsByAccountId }))

        await expect(service.getNotificationsByAccountId(7)).resolves.toEqual([
            {
                id: 1,
                accountId: 7,
                type: 'meeting_scheduled',
                message: 'message',
                data: { account: 8, group: 12, meeting: 21 },
                // Stored without a zone (UTC); answered as ISO so browsers don't read it as local time.
                createdAt: '2026-08-14T00:00:00.000Z',
                isRead: false,
            },
        ])
        expect(getNotificationsByAccountId).toHaveBeenCalledWith(7)
    })

    it('scopes notification updates and deletes to the authenticated account', async () => {
        const updateNotification = vi.fn().mockResolvedValue({ rowsAffected: 1 })
        const deleteNotificationById = vi.fn().mockResolvedValue({ rowsAffected: 1 })
        const service = new NotificationsService(fakeDatabase({ updateNotification, deleteNotificationById }))

        await expect(service.updateNotification(1, 7, { isRead: false })).resolves.toEqual({ success: true })
        await expect(service.deleteNotificationById(1, 7)).resolves.toEqual({ success: true })

        expect(updateNotification).toHaveBeenCalledWith(1, 7, { isRead: false })
        expect(deleteNotificationById).toHaveBeenCalledWith(1, 7)
    })
})

describe('NotificationsService reading an inbox', () => {
    const row = (id: number, type: string, data: string, message = `Notification ${id}`) => [
        id,
        7,
        type,
        message,
        data,
        '2026-10-15 18:19:05',
        0,
    ]
    const inbox = async (rows: Array<Array<unknown>>) => {
        const service = new NotificationsService(fakeDatabase({ getNotificationsByAccountId: vi.fn().mockResolvedValue({ rows }) }))
        const warn = vi.spyOn((service as unknown as { LOGGER: { warn: () => void } }).LOGGER, 'warn').mockImplementation(() => undefined)

        return { notifications: await service.getNotificationsByAccountId(7), warn }
    }

    it('reads the game proposal and group person notifications the API writes', async () => {
        const { notifications, warn } = await inbox([
            row(1, 'game_proposal_submitted', '{"gameTitle":"Azul","proposalId":4,"submittedBy":9}'),
            row(2, 'game_proposal_approved', '{"gameTitle":"Azul","proposalId":4,"createdGameId":88}'),
            row(3, 'game_proposal_rejected', '{"gameTitle":"Azul","proposalId":4,"reviewNotes":"Not a board game"}'),
            row(4, 'game_proposal_duplicate', '{"gameTitle":"Azul","proposalId":4,"duplicateOfGameId":40,"duplicateOfTitle":"Azul"}'),
            row(5, 'user_joined_group', '{"account":8,"group":12}'),
            row(6, 'group_person_changed', '{"account":8,"group":12,"person":3,"game":40}'),
        ])

        expect(notifications.map(notification => notification.id)).toEqual([1, 2, 3, 4, 5, 6])
        // The data is kept whole, so the app can link where the notification points.
        expect(notifications[0]?.data).toEqual({ gameTitle: 'Azul', proposalId: 4, submittedBy: 9 })
        expect(notifications[1]?.data).toEqual({ gameTitle: 'Azul', proposalId: 4, createdGameId: 88 })
        expect(warn).not.toHaveBeenCalled()
    })

    it('keeps older types the app still shows', async () => {
        const { notifications } = await inbox([row(1, 'member_left', '{"account":8,"group":12}')])

        expect(notifications.map(notification => notification.type)).toEqual(['member_left'])
    })

    it('leaves out only the notifications it cannot read, instead of emptying the inbox', async () => {
        const { notifications, warn } = await inbox([
            row(1, 'user_joined_group', '{"account":8,"group":12}'),
            row(2, 'meeting_scheduled', '{"account":8}'),
            row(3, 'user_joined_group', 'not json'),
            row(4, 'user_joined_group', '{"account":8,"group":12}', ''),
            row(5, 'session_finished', '{"account":8,"group":12,"meeting":21}'),
        ])

        expect(notifications.map(notification => notification.id)).toEqual([1, 5])
        expect(warn).toHaveBeenCalledWith('Left out notifications that could not be read; the others are returned')
    })
})
