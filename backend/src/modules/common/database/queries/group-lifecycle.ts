import type { Transaction } from '@libsql/client'

/**
 * Takes an account out of one group, inside the caller's transaction (ADR-0018).
 *
 * Completed sessions keep the account and its group person untouched, so history
 * counts never change. Sessions that have not happened yet drop them, and the
 * sessions they organised that are still scheduled or running pass to the group
 * owner, who can then manage them. Run it after any ownership change.
 */
export async function departGroup(transaction: Transaction, accountId: number, groupId: number): Promise<void> {
    const upcoming = "SELECT id FROM Meet WHERE groupId = ? AND status = 'scheduled'"
    const linkedPerson = 'SELECT id FROM GroupPerson WHERE groupId = ? AND accountId = ?'

    await transaction.batch([
        { sql: 'DELETE FROM GroupMembership WHERE accountId = ? AND groupId = ?', args: [accountId, groupId] },
        { sql: `DELETE FROM MeetGameResult WHERE accountId = ? AND meetId IN (${upcoming})`, args: [accountId, groupId] },
        {
            sql: `DELETE FROM MeetGameResult WHERE groupPersonId IN (${linkedPerson}) AND meetId IN (${upcoming})`,
            args: [groupId, accountId, groupId],
        },
        { sql: `DELETE FROM MeetAccountGame WHERE accountId = ? AND meetId IN (${upcoming})`, args: [accountId, groupId] },
        {
            sql: `DELETE FROM MeetPersonGame WHERE groupPersonId IN (${linkedPerson}) AND meetId IN (${upcoming})`,
            args: [groupId, accountId, groupId],
        },
        { sql: `DELETE FROM MeetAttendee WHERE accountId = ? AND meetId IN (${upcoming})`, args: [accountId, groupId] },
        {
            sql: `DELETE FROM MeetPersonAttendee WHERE groupPersonId IN (${linkedPerson}) AND meetId IN (${upcoming})`,
            args: [groupId, accountId, groupId],
        },
        {
            sql: `
                UPDATE Meet SET createdBy = (SELECT createdBy FROM UserGroup WHERE id = ?)
                WHERE groupId = ? AND createdBy = ? AND status IN ('scheduled', 'active')
            `,
            args: [groupId, groupId, accountId],
        },
    ])
}

/**
 * Deletes a group and everything in it, inside the caller's transaction, and answers how many groups went (0 or 1). Session
 * rows go first: they hold the group's people with RESTRICT, so with foreign keys
 * on, deleting the group alone fails as soon as it has history.
 */
export async function deleteGroupRows(transaction: Transaction, groupId: number): Promise<number> {
    const meets = 'SELECT id FROM Meet WHERE groupId = ?'

    const results = await transaction.batch([
        { sql: `DELETE FROM MeetGameResult WHERE meetId IN (${meets})`, args: [groupId] },
        { sql: `DELETE FROM MeetPersonGame WHERE meetId IN (${meets})`, args: [groupId] },
        { sql: `DELETE FROM MeetPersonAttendee WHERE meetId IN (${meets})`, args: [groupId] },
        { sql: 'DELETE FROM Meet WHERE groupId = ?', args: [groupId] },
        { sql: 'DELETE FROM UserGroup WHERE id = ?', args: [groupId] },
    ])

    return results.at(-1)?.rowsAffected ?? 0
}
