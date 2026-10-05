import { BadRequestException } from '@nestjs/common'

import type { CreateNotificationBody, UpdateNotificationBody } from '../../../../common/types/notification.type.js'
import type { DatabaseService } from '../database.service.js'

/** Notifications. */
export class NotificationQueries {
    constructor(private readonly database: DatabaseService) {}

    getNotifications() {
        return this.database.execute('SELECT * FROM Notification')
    }

    getNotificationById(id: number, accountId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM Notification WHERE id = ? AND accountId = ?',
            args: [id, accountId],
        })
    }

    getNotificationsByAccountId(accountId: number) {
        return this.database.execute({
            sql: `
                SELECT n.id, n.accountId, n.type, n.message, n.data, n.createdAt, n.isRead
                FROM Notification n
                WHERE n.accountId = ?
            `,
            args: [accountId],
        })
    }

    createNotification(notificationDto: CreateNotificationBody) {
        // Serialize data to JSON string for storage
        const dataJson = JSON.stringify(notificationDto.data || {})

        return this.database.execute({
            sql: 'INSERT INTO Notification (accountId, type, message, data) VALUES (?, ?, ?, ?)',
            args: [notificationDto.accountId, notificationDto.type, notificationDto.message, dataJson],
        })
    }

    updateNotification(id: number, accountId: number, partialNotificationDto: Pick<UpdateNotificationBody, 'isRead'>) {
        // Array to store fields to update
        const fields = []
        const args = []

        // Only the recipient's read state is mutable through the user-facing route.
        if (partialNotificationDto.isRead !== undefined) {
            fields.push('isRead = ?')
            args.push(partialNotificationDto.isRead)
        }

        // Error if no fields are provided
        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        // Scope the mutation to the authenticated recipient.
        args.push(id, accountId)

        // Construct the final query
        const sql = `
          UPDATE Notification
          SET ${fields.join(', ')}
          WHERE id = ? AND accountId = ?
        `

        // Execute the query
        return this.database.execute({ sql, args })
    }

    deleteNotificationById(id: number, accountId: number) {
        return this.database.execute({
            sql: 'DELETE FROM Notification WHERE id = ? AND accountId = ?',
            args: [id, accountId],
        })
    }
}
