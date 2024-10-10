import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ResultSet } from '@libsql/client/.'
import { CreateNotificationBody, NotificationDto, UpdateNotificationBody } from 'src/common/types/notification.type'
import { nnotificationsSchema } from 'src/common/schemas'

@Injectable()
export class NotificationsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<NotificationDto> {
        console.log(resultSet)
        const notifications = resultSet.rows.map(row => ({
            id: Number(row[0]),
            accountId: Number(row[1]),
            type: String(row[2]),
            relatedUserGroupId: row[3],
            relatedGameId: row[4],
            message: String(row[5]),
            createdAt: String(row[6]),
            isRead: Boolean(row[7]),
        }))

        const result = nnotificationsSchema.safeParse(notifications)

        if (!result.success) {
            this.LOGGER.error('Failed to parse notifications from database')
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

    async createNotification(notificationDto: CreateNotificationBody) {
        this.LOGGER.log('Creating notification')
        try {
            await this.databaseService.createNotification(notificationDto)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to create notification', error)
            return new ConflictException('Notification title already in use')
        }
    }

    async updateNotification(id: number, partialNotificationDto: UpdateNotificationBody): Promise<{ success: boolean }> {
        this.LOGGER.log(`Updating notification with id ${id}`)
        const resultSet = await this.databaseService.updateNotification(id, partialNotificationDto)

        if (resultSet.rows.length === 0) {
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
