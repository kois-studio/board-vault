import { deleteGroupRows, departGroup } from './group-lifecycle.js'

import type { DatabaseService } from '../database.service.js'

/** What a deleted account shows wherever it still appears (ADR-0018). */
export const DELETED_ACCOUNT_NAME = 'Deleted account'
export const DELETED_ACCOUNT_AVATAR = JSON.stringify({
    type: 'icon',
    iconName: 'person-fill',
    emoji: null,
    initials: '',
    backgroundColor: '#64748b',
})

/**
 * Account deletion (ADR-0018), in one transaction. The `Account` row stays so
 * history keeps its references, but nothing personal is left on it or in the
 * groups: the person shows as "Deleted account" everywhere, and their private
 * data is removed. Running it again on a deleted account changes nothing.
 */
export class AccountDeletionQueries {
    constructor(private readonly database: DatabaseService) {}

    async deleteAccount(accountId: number): Promise<{ deletedGroupIds: Array<number> }> {
        const transaction = await this.database.transaction('write')

        try {
            const account = await transaction.execute({ sql: 'SELECT email FROM Account WHERE id = ?', args: [accountId] })
            const email = account.rows[0]?.email

            if (email === undefined) {
                await transaction.commit()
                return { deletedGroupIds: [] }
            }

            // Groups they own pass to the member who joined first; a group with nobody else goes.
            const deletedGroupIds: Array<number> = []
            const ownedGroups = await transaction.execute({ sql: 'SELECT id FROM UserGroup WHERE createdBy = ?', args: [accountId] })

            for (const row of ownedGroups.rows) {
                const groupId = Number(row.id)
                const nextOwner = await transaction.execute({
                    sql: `
                        SELECT gm.accountId
                        FROM GroupMembership gm
                        INNER JOIN Account a ON a.id = gm.accountId AND a.isDeleted = 0
                        WHERE gm.groupId = ? AND gm.accountId != ?
                        ORDER BY gm.joinedAt ASC, gm.accountId ASC
                        LIMIT 1
                    `,
                    args: [groupId, accountId],
                })
                const nextOwnerId = nextOwner.rows[0]?.accountId

                if (nextOwnerId === undefined || nextOwnerId === null) {
                    await deleteGroupRows(transaction, groupId)
                    deletedGroupIds.push(groupId)
                } else {
                    await transaction.execute({
                        sql: 'UPDATE UserGroup SET createdBy = ? WHERE id = ?',
                        args: [Number(nextOwnerId), groupId],
                    })
                }
            }

            const memberships = await transaction.execute({
                sql: 'SELECT groupId FROM GroupMembership WHERE accountId = ?',
                args: [accountId],
            })

            for (const row of memberships.rows) {
                await departGroup(transaction, accountId, Number(row.groupId))
            }

            const linkedPeople = 'SELECT id FROM GroupPerson WHERE accountId = ?'

            await transaction.batch([
                // Their place in each group's history stays, without their name or face.
                {
                    sql: `
                        UPDATE GroupPerson
                        SET displayName = ?, avatar = ?, claimEmail = NULL, claimExpiresAt = NULL, updatedAt = CURRENT_TIMESTAMP
                        WHERE accountId = ?
                    `,
                    args: [DELETED_ACCOUNT_NAME, DELETED_ACCOUNT_AVATAR, accountId],
                },
                { sql: `DELETE FROM GroupPersonGameOwnership WHERE groupPersonId IN (${linkedPeople})`, args: [accountId] },
                { sql: `DELETE FROM GroupPersonGamePreference WHERE groupPersonId IN (${linkedPeople})`, args: [accountId] },
                // Pending claims still addressed to their email.
                {
                    sql: 'UPDATE GroupPerson SET claimEmail = NULL, claimExpiresAt = NULL WHERE claimEmail = ? COLLATE NOCASE',
                    args: [String(email)],
                },
                // Private data.
                { sql: 'DELETE FROM OwnedGame WHERE accountId = ?', args: [accountId] },
                { sql: 'DELETE FROM WishlistedGame WHERE accountId = ?', args: [accountId] },
                { sql: 'DELETE FROM GameReview WHERE accountId = ?', args: [accountId] },
                { sql: 'DELETE FROM CollectionActivity WHERE accountId = ?', args: [accountId] },
                { sql: 'DELETE FROM Notification WHERE accountId = ?', args: [accountId] },
                { sql: 'DELETE FROM GroupGameInterest WHERE accountId = ?', args: [accountId] },
                { sql: 'DELETE FROM Invitation WHERE fromAccountId = ? OR toAccountId = ?', args: [accountId, accountId] },
                { sql: "DELETE FROM GameProposal WHERE submittedBy = ? AND status = 'pending'", args: [accountId] },
                {
                    sql: `
                        UPDATE Account
                        SET email = ?, username = ?, displayName = ?, avatar = ?, isAdmin = 0, isDeleted = 1
                        WHERE id = ?
                    `,
                    args: [
                        `deleted-${accountId}@deleted.invalid`,
                        `deleted-${accountId}`,
                        DELETED_ACCOUNT_NAME,
                        DELETED_ACCOUNT_AVATAR,
                        accountId,
                    ],
                },
            ])

            await transaction.commit()
            return { deletedGroupIds }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }
}
