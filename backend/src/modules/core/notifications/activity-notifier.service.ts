import { Injectable, Logger } from '@nestjs/common'

import { safeErrorName, structuredLog } from '../../../common/logging/structured-log.js'
import { parseStoredDate } from '../../../common/utils/stored-date.js'
import { DatabaseService } from '../../common/database/database.service.js'

import { NotificationTypeEnum } from './notifications-enum.type.js'

type SessionChange = 'active' | 'completed' | 'cancelled'

const SESSION_CHANGE_TYPES: Record<SessionChange, NotificationTypeEnum> = {
    active: NotificationTypeEnum.SESSION_STARTED,
    completed: NotificationTypeEnum.SESSION_FINISHED,
    cancelled: NotificationTypeEnum.SESSION_CANCELLED,
}

/** "Fri 9 Oct, 19:00" in the session's timezone, falling back to UTC for an unknown zone. */
export function formatSessionDate(storedDate: string, timezone: string): string {
    const date = new Date(parseStoredDate(storedDate))
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }

    try {
        return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: timezone }).format(date)
    } catch {
        return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(date)
    }
}

/**
 * In-app notifications for what happens in a group: a game night planned, started, finished or
 * cancelled, and someone joining. Sent after the change is saved; a failure is logged and never
 * fails the request that caused it. The person who acted is never notified.
 */
@Injectable()
export class ActivityNotifier {
    private readonly LOGGER = new Logger(ActivityNotifier.name)

    constructor(private readonly databaseService: DatabaseService) {}

    async sessionPlanned(sessionId: number, actorAccountId: number): Promise<void> {
        await this.guard('session_planned', async () => {
            const context = await this.sessionContext(sessionId)

            if (!context) return
            const actor = await this.accountName(actorAccountId)
            const invited = await this.invitedAccounts(sessionId)

            await this.send(
                invited.map(({ accountId }) => accountId),
                actorAccountId,
                NotificationTypeEnum.MEETING_SCHEDULED,
                `${actor} planned a game night in ${context.groupName} for ${context.when}. Can you make it?`,
                { account: actorAccountId, meeting: sessionId, group: context.groupId },
            )
        })
    }

    async sessionChanged(sessionId: number, actorAccountId: number, status: SessionChange): Promise<void> {
        await this.guard('session_changed', async () => {
            const context = await this.sessionContext(sessionId)

            if (!context) return
            const actor = await this.accountName(actorAccountId)
            const invited = await this.invitedAccounts(sessionId)
            // A cancellation reaches everyone invited; starting and finishing only those who did not decline.
            const recipients = invited.filter(({ rsvpStatus }) => status === 'cancelled' || rsvpStatus !== 'declined')
            const message = {
                active: `${actor} started the ${context.groupName} game night. Mark what you play as you go.`,
                completed: `The ${context.groupName} game night of ${context.when} is finished. Rate what you played.`,
                cancelled: `${actor} cancelled the ${context.groupName} game night of ${context.when}.`,
            }[status]

            await this.send(
                recipients.map(({ accountId }) => accountId),
                actorAccountId,
                SESSION_CHANGE_TYPES[status],
                message,
                { account: actorAccountId, meeting: sessionId, group: context.groupId },
            )
        })
    }

    async memberJoined(groupId: number, accountId: number): Promise<void> {
        await this.guard('member_joined', async () => {
            const rows = (await this.databaseService.notifications.getGroupNotificationContext(groupId)).rows
            const groupName = rows[0] ? String(rows[0][0]) : null

            if (!groupName) return
            const name = await this.accountName(accountId)

            await this.send(
                rows.filter(row => row[1] !== null).map(row => Number(row[1])),
                accountId,
                NotificationTypeEnum.USER_JOINED_GROUP,
                `${name} joined ${groupName}.`,
                { account: accountId, group: groupId },
            )
        })
    }

    private async guard(event: string, work: () => Promise<void>): Promise<void> {
        try {
            await work()
        } catch (error) {
            this.LOGGER.warn(structuredLog('notification_failed', { event, error: safeErrorName(error) }))
        }
    }

    private async send(
        recipients: Array<number>,
        actorAccountId: number,
        type: NotificationTypeEnum,
        message: string,
        data: Record<string, number>,
    ): Promise<void> {
        const accountIds = [...new Set(recipients)].filter(accountId => accountId !== actorAccountId)

        if (accountIds.length === 0) return
        await this.databaseService.notifications.createNotifications(
            accountIds.map(accountId => ({ accountId, type, message, data: data as never })),
        )
    }

    private async sessionContext(sessionId: number) {
        const [row] = (await this.databaseService.notifications.getSessionNotificationContext(sessionId)).rows

        if (!row) return null
        return { groupId: Number(row[0]), groupName: String(row[1]), when: formatSessionDate(String(row[2]), String(row[3] ?? 'UTC')) }
    }

    private async invitedAccounts(sessionId: number) {
        const rows = (await this.databaseService.notifications.getSessionInvitedAccounts(sessionId)).rows

        return rows.map(row => ({ accountId: Number(row[0]), rsvpStatus: String(row[1]) }))
    }

    private async accountName(accountId: number): Promise<string> {
        const [row] = (await this.databaseService.notifications.getAccountName(accountId)).rows

        return row?.[0] ? String(row[0]) : 'Someone'
    }
}
