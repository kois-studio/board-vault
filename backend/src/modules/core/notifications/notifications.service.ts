import { ResultSet } from '@libsql/client'
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { notificationsSchema } from '../../../common/schemas'
import { CreateNotificationBody, NotificationDto, UpdateNotificationRequestBody } from '../../../common/types/notification.type'
import { DatabaseService } from '../../common/database/database.service'

import { NotificationDataMap, NotificationTypeEnum } from './notifications-enum.type'

@Injectable()
export class NotificationsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<NotificationDto> {
        const notifications = resultSet.rows.map(row => ({
            id: Number(row[0]),
            accountId: Number(row[1]),
            type: String(row[2]),
            message: String(row[3]),
            data: JSON.parse(String(row[4])) as NotificationDataMap[NotificationTypeEnum],
            createdAt: String(row[5]),
            isRead: Boolean(row[6]),
        }))

        return this._validateSchema(notifications)
    }

    private _validateSchema(notifications: Array<NotificationDto>): Array<NotificationDto> {
        const result = notificationsSchema.safeParse(notifications)

        if (!result.success) {
            this.LOGGER.error('Failed to parse Notifications from database')
            return []
        }

        return result.data
    }

    async getNotifications(): Promise<Array<NotificationDto>> {
        this.LOGGER.log('Getting all notifications')
        const resultSet = await this.databaseService.notifications.getNotifications()

        return this._parseResultSet(resultSet)
    }

    async getNotificationById(id: number, accountId: number): Promise<NotificationDto> {
        this.LOGGER.log('Getting notification by id')
        const resultSet = await this.databaseService.notifications.getNotificationById(id, accountId)
        const notifications = this._parseResultSet(resultSet)

        if (notifications.length === 0) {
            throw new NotFoundException(`Notification with id ${id} not found`)
        }
        return notifications[0]
    }

    async getNotificationsByAccountId(accountId: number): Promise<Array<NotificationDto>> {
        this.LOGGER.log('Getting notifications for account')
        const resultSet = await this.databaseService.notifications.getNotificationsByAccountId(accountId)

        return this._parseResultSet(resultSet)
    }

    async createNotification(notificationDto: CreateNotificationBody) {
        this.LOGGER.log('Creating notification')
        try {
            await this.databaseService.notifications.createNotification(notificationDto)

            return { success: true }
        } catch {
            this.LOGGER.error('Failed to create notification')
            throw new ConflictException('Notification title already in use')
        }
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
