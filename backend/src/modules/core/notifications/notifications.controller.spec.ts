import { NotificationsController } from './notifications.controller.js'
import { NotificationsService } from './notifications.service.js'

describe('NotificationsController actor identity', () => {
    const request = { user: { userId: 7 } }

    it('scopes the legacy notification list to the authenticated account', async () => {
        const getNotificationsByAccountId = vi.fn().mockResolvedValue([])
        const controller = new NotificationsController({ getNotificationsByAccountId } as unknown as NotificationsService)

        await controller.getNotifications(request)

        expect(getNotificationsByAccountId).toHaveBeenCalledWith(7)
    })

    it('has no way for a person to create notifications: only the API writes them', () => {
        expect('createNotification' in NotificationsController.prototype).toBe(false)
    })

    it('passes the authenticated account to notification reads and mutations', async () => {
        const getNotificationById = vi.fn().mockResolvedValue({})
        const updateNotification = vi.fn().mockResolvedValue({ success: true })
        const deleteNotificationById = vi.fn().mockResolvedValue({ success: true })
        const controller = new NotificationsController({
            getNotificationById,
            updateNotification,
            deleteNotificationById,
        } as unknown as NotificationsService)

        await controller.getNotificationById(request, 12)
        await controller.updateNotification(request, 12, { isRead: true })
        await controller.deleteNotificationById(request, 12)

        expect(getNotificationById).toHaveBeenCalledWith(12, 7)
        expect(updateNotification).toHaveBeenCalledWith(12, 7, { isRead: true })
        expect(deleteNotificationById).toHaveBeenCalledWith(12, 7)
    })
})
