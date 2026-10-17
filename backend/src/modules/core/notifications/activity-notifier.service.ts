import { Injectable, Logger } from '@nestjs/common'

import { safeErrorName, structuredLog } from '../../../common/logging/structured-log.js'
import { parseStoredDate } from '../../../common/utils/stored-date.js'
import { DatabaseService } from '../../common/database/database.service.js'

import { NotificationTypeEnum } from './notifications-enum.type.js'
import { isEmptyShelfChange, type ShelfChange } from './shelf-notification.js'

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
 * cancelled, someone joining or leaving, someone's shelf changing, and someone changing what another
 * member entered for a group person. Sent after the change is saved; a failure is logged and never
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

    /** The other members hear it; someone who left and comes back before they read it is no news. */
    async memberJoined(groupId: number, accountId: number): Promise<void> {
        await this.guard('member_joined', async () => {
            const members = await this.groupMembers(groupId)

            if (!members) return
            const name = await this.accountName(accountId)

            await this.databaseService.notifications.createOrCancel(
                this.addressed(
                    members.accountIds,
                    [accountId],
                    NotificationTypeEnum.USER_JOINED_GROUP,
                    `${name} joined ${members.groupName}.`,
                    {
                        account: accountId,
                        group: groupId,
                    },
                ),
                { type: NotificationTypeEnum.USER_LEFT_GROUP, data: { group: groupId, member: accountId } },
            )
        })
    }

    /**
     * Someone left a group, or its owner (`actorAccountId`) removed them: the members still in it
     * hear it, except whoever acted. Someone who leaves before they read that the person joined is no news.
     */
    async memberLeft(groupId: number, memberAccountId: number, actorAccountId: number): Promise<void> {
        await this.guard('member_left', async () => {
            const members = await this.groupMembers(groupId)

            if (!members) return
            const member = await this.accountName(memberAccountId)
            const message =
                actorAccountId === memberAccountId
                    ? `${member} left ${members.groupName}.`
                    : `${await this.accountName(actorAccountId)} removed ${member} from ${members.groupName}.`

            await this.databaseService.notifications.createOrCancel(
                this.addressed(members.accountIds, [actorAccountId, memberAccountId], NotificationTypeEnum.USER_LEFT_GROUP, message, {
                    account: actorAccountId,
                    group: groupId,
                    member: memberAccountId,
                }),
                { type: NotificationTypeEnum.USER_JOINED_GROUP, data: { group: groupId, account: memberAccountId } },
            )
        })
    }

    /**
     * Games went onto or off someone's shelf: everyone sharing a group with them hears it, in one
     * notification per person that stays up to date while unread, so adding and removing games over
     * and over never fills anyone's inbox (NotificationQueries.recordShelfChange).
     */
    async shelfChanged(accountId: number, change: Partial<ShelfChange>): Promise<void> {
        const full = { added: change.added ?? [], removed: change.removed ?? [] }

        if (isEmptyShelfChange(full)) return
        await this.guard('shelf_changed', async () => {
            await this.databaseService.notifications.recordShelfChange(accountId, await this.accountName(accountId), full)
        })
    }

    /**
     * Someone changed a game or a preference that another member entered for a group person
     * (ADR-0020): that member hears it, if they are still in the group. Everyone else sees it in the
     * group history.
     */
    async groupPersonEntryChanged(change: {
        groupId: number
        actorAccountId: number
        enteredByAccountId: number
        groupPersonId: number
        gameId: number
        change: 'owned' | 'not_owned' | 'unsure' | 'preference' | 'preference_removed'
    }): Promise<void> {
        if (change.enteredByAccountId === change.actorAccountId) return
        await this.guard('group_person_changed', async () => {
            const rows = (await this.databaseService.notifications.getGroupNotificationContext(change.groupId)).rows
            const groupName = rows[0] ? String(rows[0][0]) : null

            if (!groupName || !rows.some(row => Number(row[1]) === change.enteredByAccountId)) return
            const [personRow] = (await this.databaseService.groups.getGroupPersonById(change.groupPersonId, change.groupId)).rows
            const [gameRow] = (await this.databaseService.groupActivity.getGameTitles([change.gameId])).rows

            if (!personRow) return
            const actor = await this.accountName(change.actorAccountId)
            const person = String(personRow[5])
            const game = gameRow?.[1] ? String(gameRow[1]) : 'a game'
            const message = {
                owned: `${actor} said ${person} has ${game}, in ${groupName}.`,
                not_owned: `${actor} removed ${game} from ${person}'s games in ${groupName}.`,
                unsure: `${actor} marked ${game} as unsure for ${person}, in ${groupName}.`,
                preference: `${actor} changed how much ${person} likes ${game}, in ${groupName}.`,
                preference_removed: `${actor} removed what ${person} thinks of ${game}, in ${groupName}.`,
            }[change.change]

            await this.send([change.enteredByAccountId], change.actorAccountId, NotificationTypeEnum.GROUP_PERSON_CHANGED, message, {
                account: change.actorAccountId,
                group: change.groupId,
                person: change.groupPersonId,
                game: change.gameId,
            })
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
        const notifications = this.addressed(recipients, [actorAccountId], type, message, data)

        if (notifications.length === 0) return
        await this.databaseService.notifications.createNotifications(notifications)
    }

    /** One notification per recipient, once each, leaving out the people it is about or who acted. */
    private addressed(
        recipients: Array<number>,
        leftOut: Array<number>,
        type: NotificationTypeEnum,
        message: string,
        data: Record<string, number>,
    ) {
        return [...new Set(recipients)]
            .filter(accountId => !leftOut.includes(accountId))
            .map(accountId => ({ accountId, type, message, data: data as never }))
    }

    /** A group's name and its members' accounts, or null when the group is gone. */
    private async groupMembers(groupId: number) {
        const rows = (await this.databaseService.notifications.getGroupNotificationContext(groupId)).rows

        if (!rows[0]) return null
        return { groupName: String(rows[0][0]), accountIds: rows.filter(row => row[1] !== null).map(row => Number(row[1])) }
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
