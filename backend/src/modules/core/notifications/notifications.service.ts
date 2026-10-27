import { ResultSet } from '@libsql/client'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { notificationSchema } from '../../../common/schemas/index.js'
import { NotificationContextDto, NotificationDto, UpdateNotificationRequestBody } from '../../../common/types/notification.type.js'
import { shortName } from '../../../common/utils/display-name.js'
import { toIsoDate } from '../../../common/utils/index.js'
import { DatabaseService } from '../../common/database/database.service.js'

import { contextFor, mergeRefs, notificationRefs, type NotificationRefs } from './notification-context.js'

import type { Locale } from '../../../common/i18n/locale.js'

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

    /**
     * The inbox with what each notification refers to (ADR-0024): current names, the game night's
     * date and time zone, and game titles in the reader's language, so the app words it.
     */
    async getInbox(accountId: number, locale: Locale): Promise<Array<NotificationDto>> {
        const notifications = await this.getNotificationsByAccountId(accountId)
        const refs = notifications.map(notification => notificationRefs(notification))
        const found = await this.readContext(mergeRefs(refs), locale)

        return notifications.map((notification, index) => ({ ...notification, context: contextFor(refs[index]!, found) }))
    }

    private async readContext(refs: NotificationRefs, locale: Locale): Promise<NotificationContextDto> {
        const queries = this.databaseService.notifications
        const read = async <T>(wanted: Array<number>, query: () => Promise<ResultSet>, map: (row: ResultSet['rows'][number]) => T) =>
            wanted.length === 0 ? [] : (await query()).rows.map(map)

        const [accounts, groups, sessions, people, games] = await Promise.all([
            read(
                refs.accounts,
                () => queries.getContextAccounts(refs.accounts),
                row => {
                    const deleted = Number(row.isDeleted) === 1

                    return { id: Number(row.id), name: deleted ? null : shortName(String(row.name)), deleted }
                },
            ),
            read(
                refs.groups,
                () => queries.getContextGroups(refs.groups),
                row => ({ id: Number(row.id), name: String(row.name) }),
            ),
            read(
                refs.sessions,
                () => queries.getContextSessions(refs.sessions),
                row => ({
                    id: Number(row.id),
                    date: toIsoDate(String(row.meetDate)),
                    timezone: row.timezone ? String(row.timezone) : 'UTC',
                }),
            ),
            read(
                refs.people,
                () => queries.getContextPeople(refs.people),
                row => ({ id: Number(row.id), name: shortName(String(row.displayName)) }),
            ),
            read(
                refs.games,
                () => queries.getContextGames(refs.games, locale),
                row => ({
                    id: Number(row.id),
                    title: String(row.title ?? ''),
                    titleLanguage: String(row.language),
                }),
            ),
        ])

        return { accounts, groups, sessions, people, games: games.filter(game => game.title !== '') }
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
