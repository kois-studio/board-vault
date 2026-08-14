import { DatabaseService } from '../../common/database/database.service'

import { NotificationsService } from './notifications.service'

const notificationRows = [[1, 7, 'meeting_scheduled', 'message', '{"account":8,"group":12,"meeting":21}', '2026-08-14 00:00:00', 0]]

describe('NotificationsService ownership', () => {
    it('returns an owned notification and forwards the account boundary', async () => {
        const getNotificationById = jest.fn().mockResolvedValue({ rows: notificationRows })
        const service = new NotificationsService({ getNotificationById } as unknown as DatabaseService)

        await expect(service.getNotificationById(1, 7)).resolves.toMatchObject({
            id: 1,
            accountId: 7,
            data: { account: 8, group: 12, meeting: 21 },
        })
        expect(getNotificationById).toHaveBeenCalledWith(1, 7)
    })

    it('returns only the account notification data shape', async () => {
        const getNotificationsByAccountId = jest.fn().mockResolvedValue({ rows: notificationRows })
        const service = new NotificationsService({ getNotificationsByAccountId } as unknown as DatabaseService)

        await expect(service.getNotificationsByAccountId(7)).resolves.toEqual([
            {
                id: 1,
                accountId: 7,
                type: 'meeting_scheduled',
                message: 'message',
                data: { account: 8, group: 12, meeting: 21 },
                createdAt: '2026-08-14 00:00:00',
                isRead: false,
            },
        ])
        expect(getNotificationsByAccountId).toHaveBeenCalledWith(7)
    })

    it('scopes notification updates and deletes to the authenticated account', async () => {
        const updateNotification = jest.fn().mockResolvedValue({ rowsAffected: 1 })
        const deleteNotificationById = jest.fn().mockResolvedValue({ rowsAffected: 1 })
        const service = new NotificationsService({ updateNotification, deleteNotificationById } as unknown as DatabaseService)

        await expect(service.updateNotification(1, 7, { isRead: false })).resolves.toEqual({ success: true })
        await expect(service.deleteNotificationById(1, 7)).resolves.toEqual({ success: true })

        expect(updateNotification).toHaveBeenCalledWith(1, 7, { isRead: false })
        expect(deleteNotificationById).toHaveBeenCalledWith(1, 7)
    })
})
