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

    /** Several notifications in one statement, for an event that reaches many people. */
    createNotifications(notifications: Array<CreateNotificationBody>) {
        return this.database.execute({
            sql: `INSERT INTO Notification (accountId, type, message, data) VALUES ${notifications.map(() => '(?, ?, ?, ?)').join(', ')}`,
            args: notifications.flatMap(notification => [
                notification.accountId,
                notification.type,
                notification.message,
                JSON.stringify(notification.data || {}),
            ]),
        })
    }

    /** What a session notification says: its group, date and timezone. */
    getSessionNotificationContext(sessionId: number) {
        return this.database.execute({
            sql: `
                SELECT m.groupId, g.name, m.meetDate, m.timezone
                FROM Meet m
                INNER JOIN UserGroup g ON g.id = m.groupId
                WHERE m.id = ?
            `,
            args: [sessionId],
        })
    }

    /** The accounts a session invites, directly or through a linked group person, with their answer. */
    getSessionInvitedAccounts(sessionId: number) {
        return this.database.execute({
            sql: `
                SELECT ma.accountId, ma.rsvpStatus
                FROM MeetAttendee ma
                INNER JOIN Account a ON a.id = ma.accountId AND a.isDeleted = 0
                WHERE ma.meetId = ?
                UNION
                SELECT gp.accountId, mpa.rsvpStatus
                FROM MeetPersonAttendee mpa
                INNER JOIN GroupPerson gp ON gp.id = mpa.groupPersonId
                INNER JOIN Account a ON a.id = gp.accountId AND a.isDeleted = 0
                WHERE mpa.meetId = ?
            `,
            args: [sessionId, sessionId],
        })
    }

    /** The other members of a group, who hear when someone joins it. */
    getGroupNotificationContext(groupId: number) {
        return this.database.execute({
            sql: `
                SELECT g.name, gm.accountId
                FROM UserGroup g
                LEFT JOIN GroupMembership gm ON gm.groupId = g.id
                LEFT JOIN Account a ON a.id = gm.accountId
                WHERE g.id = ? AND (gm.accountId IS NULL OR a.isDeleted = 0)
            `,
            args: [groupId],
        })
    }

    /** How a person is named in a notification: display name, else username. */
    getAccountName(accountId: number) {
        return this.database.execute({
            sql: "SELECT COALESCE(NULLIF(TRIM(displayName), ''), username) FROM Account WHERE id = ?",
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
