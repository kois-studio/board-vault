import { BadRequestException } from '@nestjs/common'

import { NotificationTypeEnum } from '../../../core/notifications/notifications-enum.type.js'
import {
    describeShelfChange,
    isEmptyShelfChange,
    mergeShelfChange,
    namedShelfGames,
    readShelfChange,
    type ShelfChange,
} from '../../../core/notifications/shelf-notification.js'

import type { CreateNotificationBody, UpdateNotificationBody } from '../../../../common/types/notification.type.js'
import type { DatabaseService } from '../database.service.js'
import type { InStatement, Transaction } from '@libsql/client'

/** An inbox shows the latest notifications; older ones stay stored but are not sent. */
export const INBOX_LIMIT = 100

/** The `data` keys a notification is matched by. */
type DataKey = 'account' | 'group' | 'member'

/** A value from a notification's `data`; NULL, matching nothing, when the data is not valid JSON. */
const dataField = (key: DataKey) => `CASE WHEN json_valid(data) THEN json_extract(data, '$.${key}') END`

const placeholders = (values: Array<unknown>) => values.map(() => '?').join(', ')

/** A stored `data` column, or null when it is not JSON (the notification then starts over). */
function parseData(value: unknown): unknown {
    try {
        return JSON.parse(String(value))
    } catch {
        return null
    }
}

/** Each other account in a group with the actor, with the first group they share: their games are shown there. */
const SHARING_A_GROUP = `
    SELECT other.accountId, MIN(other.groupId) AS groupId
    FROM GroupMembership mine
    INNER JOIN GroupMembership other ON other.groupId = mine.groupId AND other.accountId <> mine.accountId
    INNER JOIN Account a ON a.id = other.accountId AND a.isDeleted = 0
    WHERE mine.accountId = ?
    GROUP BY other.accountId
`

/** Notifications. */
export class NotificationQueries {
    constructor(private readonly database: DatabaseService) {}

    /**
     * Someone's shelf changed: everyone who shares a group with them hears it, through one unread
     * notification per person whose shelf changed, kept up to date instead of piling up. A new change
     * joins the unread one, which keeps only the net result, says it again and moves to the top; a
     * change that undoes everything unread removes it. Once read, the next change starts a new one.
     * It all runs in one write transaction, so two changes at once never write two.
     */
    async recordShelfChange(actorAccountId: number, actorName: string, change: ShelfChange): Promise<void> {
        if (isEmptyShelfChange(change)) return
        await this.inTransaction(async transaction => {
            const recipients = (await transaction.execute({ sql: SHARING_A_GROUP, args: [actorAccountId] })).rows.map(row => ({
                accountId: Number(row[0]),
                groupId: Number(row[1]),
            }))

            if (recipients.length === 0) return
            const unreadRows = (
                await transaction.execute({
                    sql: `
                        SELECT id, accountId, data FROM Notification
                        WHERE type = ? AND isRead = 0 AND ${dataField('account')} = ? AND accountId IN (${placeholders(recipients)})
                        ORDER BY id DESC
                    `,
                    args: [NotificationTypeEnum.SHELF_CHANGED, actorAccountId, ...recipients.map(recipient => recipient.accountId)],
                })
            ).rows
            // The newest unread one per reader is kept. An older one (none, unless two were written
            // before this rule) goes, and what it still said joins the kept one, the older change first.
            const unread = new Map<number, { id: number; change: ShelfChange }>()
            const stale: Array<number> = []

            for (const row of unreadRows) {
                const accountId = Number(row[1])
                const rowChange = readShelfChange(parseData(row[2]))
                const newer = unread.get(accountId)

                if (newer) {
                    stale.push(Number(row[0]))
                    newer.change = mergeShelfChange(rowChange, newer.change)
                    continue
                }
                unread.set(accountId, { id: Number(row[0]), change: rowChange })
            }

            const planned = recipients.map(recipient => {
                const current = unread.get(recipient.accountId)

                return {
                    ...recipient,
                    id: current?.id ?? null,
                    change: mergeShelfChange(current?.change ?? { added: [], removed: [] }, change),
                }
            })
            const titles = await this.gameTitles(transaction, [...new Set(planned.flatMap(planned => namedShelfGames(planned.change)))])
            const writes: Array<InStatement> = stale.map(id => ({ sql: 'DELETE FROM Notification WHERE id = ?', args: [id] }))

            for (const { accountId, groupId, id, change: merged } of planned) {
                const data = { account: actorAccountId, group: groupId, ...merged }
                const message = describeShelfChange(actorName, merged, titles)

                if (isEmptyShelfChange(merged)) {
                    if (id !== null) writes.push({ sql: 'DELETE FROM Notification WHERE id = ?', args: [id] })
                } else if (id !== null) {
                    writes.push({
                        sql: 'UPDATE Notification SET message = ?, data = ?, createdAt = CURRENT_TIMESTAMP WHERE id = ? AND isRead = 0',
                        args: [message, JSON.stringify(data), id],
                    })
                } else {
                    writes.push(this.insertStatement([{ accountId, type: NotificationTypeEnum.SHELF_CHANGED, message, data }]))
                }
            }

            if (writes.length > 0) await transaction.batch(writes)
        })
    }

    /**
     * Writes `notifications`, except to a reader who has an unread notification that this one undoes
     * (someone leaving before the group read that they joined, or joining again before it read that
     * they left): that one is deleted instead, and the reader hears neither.
     */
    async createOrCancel(
        notifications: Array<CreateNotificationBody>,
        undoes: { type: NotificationTypeEnum; data: Partial<Record<DataKey, number>> },
    ): Promise<void> {
        if (notifications.length === 0) return
        const matches = Object.entries(undoes.data) as Array<[DataKey, number]>
        const readers = notifications.map(notification => notification.accountId)

        await this.inTransaction(async transaction => {
            const undone = (
                await transaction.execute({
                    sql: `
                        SELECT id, accountId FROM Notification
                        WHERE type = ? AND isRead = 0 AND accountId IN (${placeholders(readers)})
                          ${matches.map(([key]) => `AND ${dataField(key)} = ?`).join(' ')}
                    `,
                    args: [undoes.type, ...readers, ...matches.map(([, value]) => value)],
                })
            ).rows
            const cancelled = new Set(undone.map(row => Number(row[1])))
            const remaining = notifications.filter(notification => !cancelled.has(notification.accountId))
            const writes: Array<InStatement> = undone.map(row => ({ sql: 'DELETE FROM Notification WHERE id = ?', args: [Number(row[0])] }))

            if (remaining.length > 0) writes.push(this.insertStatement(remaining))
            if (writes.length > 0) await transaction.batch(writes)
        })
    }

    private async gameTitles(transaction: Transaction, gameIds: Array<number>): Promise<Map<number, string>> {
        const titles = new Map<number, string>()

        if (gameIds.length === 0) return titles
        const rows = (
            await transaction.execute({
                sql: `
                    SELECT g.id, COALESCE(gt_en.title, gt_es.title)
                    FROM Game g
                    LEFT JOIN GameTranslation gt_en ON gt_en.gameId = g.id AND gt_en.languageCode = 'en'
                    LEFT JOIN GameTranslation gt_es ON gt_es.gameId = g.id AND gt_es.languageCode = 'es'
                    WHERE g.id IN (${placeholders(gameIds)})
                `,
                args: gameIds,
            })
        ).rows

        for (const row of rows) if (row[1]) titles.set(Number(row[0]), String(row[1]))
        return titles
    }

    private async inTransaction(work: (transaction: Transaction) => Promise<void>): Promise<void> {
        const transaction = await this.database.transaction('write')

        try {
            await work(transaction)
            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    private insertStatement(notifications: Array<CreateNotificationBody>): InStatement {
        return {
            sql: `INSERT INTO Notification (accountId, type, message, data) VALUES ${notifications.map(() => '(?, ?, ?, ?)').join(', ')}`,
            args: notifications.flatMap(notification => [
                notification.accountId,
                notification.type,
                notification.message,
                JSON.stringify(notification.data || {}),
            ]),
        }
    }

    getNotificationById(id: number, accountId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM Notification WHERE id = ? AND accountId = ?',
            args: [id, accountId],
        })
    }

    /** The newest notifications of an account first; rows written together keep the order they were written in. */
    getNotificationsByAccountId(accountId: number) {
        return this.database.execute({
            sql: `
                SELECT n.id, n.accountId, n.type, n.message, n.data, n.createdAt, n.isRead
                FROM Notification n
                WHERE n.accountId = ?
                ORDER BY n.createdAt DESC, n.id DESC
                LIMIT ?
            `,
            args: [accountId, INBOX_LIMIT],
        })
    }

    // What an inbox needs to word its notifications (ADR-0024): read when the inbox is read, so a
    // name or a date is always the current one and a deleted account reads as one.
    private static placeholders = (ids: Array<number>) => ids.map(() => '?').join(', ')

    getContextAccounts(accountIds: Array<number>) {
        return this.database.execute({
            sql: `SELECT id, COALESCE(NULLIF(TRIM(displayName), ''), username) AS name, isDeleted FROM Account WHERE id IN (${NotificationQueries.placeholders(accountIds)})`,
            args: accountIds,
        })
    }

    getContextGroups(groupIds: Array<number>) {
        return this.database.execute({
            sql: `SELECT id, name FROM UserGroup WHERE id IN (${NotificationQueries.placeholders(groupIds)})`,
            args: groupIds,
        })
    }

    getContextSessions(sessionIds: Array<number>) {
        return this.database.execute({
            sql: `SELECT id, meetDate, timezone FROM Meet WHERE id IN (${NotificationQueries.placeholders(sessionIds)})`,
            args: sessionIds,
        })
    }

    getContextPeople(groupPersonIds: Array<number>) {
        return this.database.execute({
            sql: `SELECT id, displayName FROM GroupPerson WHERE id IN (${NotificationQueries.placeholders(groupPersonIds)})`,
            args: groupPersonIds,
        })
    }

    /** Each game's title in the reader's language, else English, else Spanish, with the language it is in. */
    getContextGames(gameIds: Array<number>, locale: string) {
        return this.database.execute({
            sql: `
                SELECT g.id,
                    COALESCE(t.title, en.title, es.title) AS title,
                    CASE WHEN t.title IS NOT NULL THEN t.languageCode WHEN en.title IS NOT NULL THEN 'en' ELSE 'es' END AS language
                FROM Game g
                LEFT JOIN GameTranslation t ON t.gameId = g.id AND t.languageCode = ?
                LEFT JOIN GameTranslation en ON en.gameId = g.id AND en.languageCode = 'en'
                LEFT JOIN GameTranslation es ON es.gameId = g.id AND es.languageCode = 'es'
                WHERE g.id IN (${NotificationQueries.placeholders(gameIds)})
            `,
            args: [locale, ...gameIds],
        })
    }

    /** Several notifications in one statement, for an event that reaches many people. */
    createNotifications(notifications: Array<CreateNotificationBody>) {
        return this.database.execute(this.insertStatement(notifications))
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

    /** The accounts a session invites, directly or through a linked group person, with their answer; only those still in the group (ADR-0018). */
    getSessionInvitedAccounts(sessionId: number) {
        return this.database.execute({
            sql: `
                SELECT ma.accountId, ma.rsvpStatus
                FROM MeetAttendee ma
                INNER JOIN Meet m ON m.id = ma.meetId
                INNER JOIN GroupMembership gm ON gm.groupId = m.groupId AND gm.accountId = ma.accountId
                INNER JOIN Account a ON a.id = ma.accountId AND a.isDeleted = 0
                WHERE ma.meetId = ?
                UNION
                SELECT gp.accountId, mpa.rsvpStatus
                FROM MeetPersonAttendee mpa
                INNER JOIN Meet m ON m.id = mpa.meetId
                INNER JOIN GroupPerson gp ON gp.id = mpa.groupPersonId
                INNER JOIN GroupMembership gm ON gm.groupId = m.groupId AND gm.accountId = gp.accountId
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
