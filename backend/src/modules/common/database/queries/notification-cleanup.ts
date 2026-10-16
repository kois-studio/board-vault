import type { InStatement } from '@libsql/client'

/**
 * A value from a notification's `data`, read safely: a row whose data is not valid JSON gives NULL
 * (matching nothing) instead of failing the whole statement, and with it the caller's transaction.
 */
const dataField = (field: 'group' | 'account') => `CASE WHEN json_valid(data) THEN json_extract(data, '$.${field}') END`

/**
 * Notifications about a group (its game nights, someone joining) only lead somewhere while the
 * reader is in it. Leaving drops the leaver's; deleting the group drops everyone's (`accountId` null).
 */
export function forgetGroupNotifications(groupId: number, accountId: number | null): InStatement {
    return accountId === null
        ? { sql: `DELETE FROM Notification WHERE ${dataField('group')} = ?`, args: [groupId] }
        : { sql: `DELETE FROM Notification WHERE accountId = ? AND ${dataField('group')} = ?`, args: [accountId, groupId] }
}

/**
 * Notifications other people got about something this account did start with its name, frozen in
 * the text ("Ana planned a game night…"). After the account is deleted (ADR-0018) they say
 * `deletedName` instead. Only messages that start with the name the notifier used are rewritten.
 */
export function renameActorInNotifications(accountId: number, name: string, deletedName: string): InStatement {
    return {
        sql: `
            UPDATE Notification
            SET message = ? || substr(message, length(?) + 1)
            WHERE ${dataField('account')} = ? AND substr(message, 1, length(?)) = ?
        `,
        args: [deletedName, name, accountId, name, name],
    }
}
