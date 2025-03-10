import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../../common/database/database.service'
import { ResultSet } from '@libsql/client/.'
import { CreateNotificationBody, NotificationDto, UpdateNotificationBody } from '../../../common/types/notification.type'
import { notificationsSchema } from '../../../common/schemas'

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
            createdAt: String(row[4]),
            isRead: Boolean(row[5]),
        }))

        return this._validateSchema(notifications)
    }

    private _validateSchema(notifications: Array<NotificationDto>): Array<NotificationDto> {
        const result = notificationsSchema.safeParse(notifications)

        if (!result.success) {
            this.LOGGER.error('Failed to parse Notifications from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getNotifications(): Promise<Array<NotificationDto>> {
        this.LOGGER.log('Getting all notifications')
        const resultSet = await this.databaseService.getNotifications()

        return this._parseResultSet(resultSet)
    }

    async getNotificationById(id: number): Promise<NotificationDto> {
        this.LOGGER.log(`Getting notification with id ${id}`)
        const resultSet = await this.databaseService.getNotificationById(id)
        const notifications = this._parseResultSet(resultSet)

        if (notifications.length === 0) {
            throw new NotFoundException(`Notification with id ${id} not found`)
        }
        return notifications[0]
    }

    async getNotificationsByAccountId(accountId: number): Promise<Array<NotificationDto>> {
        this.LOGGER.log(`Getting notifications for account with id ${accountId}`)
        const resultSet = await this.databaseService.getNotificationsByAccountId(accountId)

        return this._parseResultSet(resultSet)
    }

    async createNotification(notificationDto: CreateNotificationBody) {
        this.LOGGER.log('Creating notification')
        try {
            await this.databaseService.createNotification(notificationDto)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to create notification', error)
            throw new ConflictException('Notification title already in use')
        }
    }

    async updateNotification(id: number, partialNotificationDto: UpdateNotificationBody): Promise<{ success: boolean }> {
        this.LOGGER.log(`Updating notification with id ${id}`)
        const resultSet = await this.databaseService.updateNotification(id, partialNotificationDto)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Notification with id ${id} not found`)
        }

        return { success: true }
    }

    async deleteNotificationById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting notification with id ${id}`)
        const resultSet = await this.databaseService.deleteNotificationById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Notification with id ${id} not found`)
        }

        return { success: true }
    }
}
