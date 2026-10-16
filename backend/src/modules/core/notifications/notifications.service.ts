import { ResultSet } from '@libsql/client'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { notificationSchema } from '../../../common/schemas/index.js'
import { NotificationDto, UpdateNotificationRequestBody } from '../../../common/types/notification.type.js'
import { toIsoDate } from '../../../common/utils/index.js'
import { DatabaseService } from '../../common/database/database.service.js'

/** The stored JSON, or null when it is not valid JSON (the row is then left out). */
function parseData(value: unknown): unknown {
    try {
        return JSON.parse(String(value))
    } catch {
        return null
    }
}

@Injectable()
export class NotificationsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    /**
     * Reads each row on its own: a row that can't be read (unknown data shape, broken JSON) is left out
     * and the rest still show, instead of the whole inbox coming back empty.
     */
    private _parseResultSet(resultSet: ResultSet): Array<NotificationDto> {
        const notifications: Array<NotificationDto> = []
        let skipped = 0

        for (const row of resultSet.rows) {
            const result = notificationSchema.safeParse({
                id: Number(row[0]),
                accountId: Number(row[1]),
                type: String(row[2]),
                message: String(row[3]),
                data: parseData(row[4]),
                // Stored by CURRENT_TIMESTAMP, UTC without a zone: answered as ISO so browsers don't read it as local time.
                createdAt: toIsoDate(String(row[5])),
                isRead: Boolean(row[6]),
            })

            if (result.success) notifications.push(result.data as NotificationDto)
            else skipped++
        }

        if (skipped > 0) this.LOGGER.warn('Left out notifications that could not be read; the others are returned')

        return notifications
    }

    async getNotificationById(id: number, accountId: number): Promise<NotificationDto> {
        this.LOGGER.log('Getting notification by id')
        const resultSet = await this.databaseService.notifications.getNotificationById(id, accountId)
        const notifications = this._parseResultSet(resultSet)

        const [notification] = notifications

        if (!notification) {
            throw new NotFoundException(`Notification with id ${id} not found`)
        }
        return notification
    }

    async getNotificationsByAccountId(accountId: number): Promise<Array<NotificationDto>> {
        this.LOGGER.log('Getting notifications for account')
        const resultSet = await this.databaseService.notifications.getNotificationsByAccountId(accountId)

        return this._parseResultSet(resultSet)
    }

    async updateNotification(
        id: number,
        accountId: number,
        partialNotificationDto: UpdateNotificationRequestBody,
    ): Promise<{ success: boolean }> {
        this.LOGGER.log('Updating notification')
        const resultSet = await this.databaseService.notifications.updateNotification(id, accountId, partialNotificationDto)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Notification with id ${id} not found`)
        }

        return { success: true }
    }

    async deleteNotificationById(id: number, accountId: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Deleting notification')
        const resultSet = await this.databaseService.notifications.deleteNotificationById(id, accountId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Notification with id ${id} not found`)
        }

        return { success: true }
    }
}
