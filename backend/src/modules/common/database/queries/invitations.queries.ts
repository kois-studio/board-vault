import { ForbiddenException, NotFoundException } from '@nestjs/common'

import { ACCOUNT_COLUMNS } from '../database.constants.js'

import type { CreateInvitationBody, CreateInvitationByUsernameBody } from '../../../../common/types/invitation.type.js'
import type { DatabaseService } from '../database.service.js'

/** Group invitations. */
export class InvitationQueries {
    constructor(private readonly database: DatabaseService) {}

    getGroupInvitations(groupId: number) {
        return this.database.execute({
            sql: `
            SELECT 
                i.id, i.groupId, i.fromAccountId, i.toAccountId, i.sentAt, i.expiresAt,
                -- Nested account responses expose public identity fields only.
                json_object(
                    'id', fa.id,
                    'username', fa.username,
                    'displayName', fa.displayName,
                    'avatar', fa.avatar
                ) as fromAccount,
                -- Nested account responses expose public identity fields only.
                json_object(
                    'id', ta.id,
                    'username', ta.username,
                    'displayName', ta.displayName,
                    'avatar', ta.avatar
                ) as toAccount
            FROM Invitation i
            JOIN Account fa ON i.fromAccountId = fa.id AND fa.isDeleted = 0
            JOIN Account ta ON i.toAccountId = ta.id AND ta.isDeleted = 0
            WHERE i.groupId = ? AND (i.expiresAt IS NULL OR i.expiresAt > CURRENT_TIMESTAMP)
            `,
            args: [groupId],
        })
    }

    getInvitations() {
        return this.database.execute('SELECT * FROM Invitation')
    }

    getInvitationById(id: number) {
        return this.database.execute({
            sql: 'SELECT * FROM Invitation WHERE id = ?',
            args: [id],
        })
    }

    getUserInvitationsReceived(accountId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM Invitation WHERE toAccountId = ? AND (expiresAt IS NULL OR expiresAt > CURRENT_TIMESTAMP)',
            args: [accountId],
        })
    }

    getInvitationByGroupAndRecipient(groupId: number, accountId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM Invitation WHERE groupId = ? AND toAccountId = ? AND (expiresAt IS NULL OR expiresAt > CURRENT_TIMESTAMP)',
            args: [groupId, accountId],
        })
    }

    async createInvitation(invitationDto: CreateInvitationBody) {
        if (invitationDto.groupPersonId !== undefined && invitationDto.groupPersonId !== null) {
            await this.assertClaimableGroupPerson(invitationDto.groupId, invitationDto.groupPersonId, invitationDto.toAccountId)
        }

        await this.database.execute({
            sql: "INSERT INTO Invitation (groupId, fromAccountId, toAccountId, expiresAt, groupPersonId) VALUES (?, ?, ?, datetime('now', '+30 days'), ?)",
            args: [invitationDto.groupId, invitationDto.fromAccountId, invitationDto.toAccountId, invitationDto.groupPersonId ?? null],
        })
    }

    async createInvitationByUsername(invitationDto: CreateInvitationByUsernameBody) {
        const toAccount = await this.database.execute({
            sql: `SELECT ${ACCOUNT_COLUMNS} FROM Account WHERE lower(username) = lower(?) AND isDeleted = 0`,
            args: [invitationDto.username],
        })

        const [invitedAccount] = toAccount.rows

        if (!invitedAccount) {
            throw new NotFoundException('User not found')
        }

        if (invitationDto.groupPersonId !== undefined && invitationDto.groupPersonId !== null) {
            await this.assertClaimableGroupPerson(invitationDto.groupId, invitationDto.groupPersonId, Number(invitedAccount.id))
        }

        await this.database.execute({
            sql: "INSERT INTO Invitation (groupId, fromAccountId, toAccountId, expiresAt, groupPersonId) VALUES (?, ?, ?, datetime('now', '+30 days'), ?)",
            args: [invitationDto.groupId, invitationDto.fromAccountId, invitedAccount.id ?? null, invitationDto.groupPersonId ?? null],
        })

        // return the invited user
        return invitedAccount
    }

    private async assertClaimableGroupPerson(groupId: number, groupPersonId: number, accountId: number): Promise<void> {
        const result = await this.database.execute({
            sql: `
                SELECT gp.id, a.email
                FROM GroupPerson gp
                INNER JOIN Account a ON a.id = ? AND a.isDeleted = 0
                WHERE gp.id = ? AND gp.groupId = ? AND gp.kind = 'placeholder'
                  AND gp.status = 'active' AND gp.accountId IS NULL
            `,
            args: [accountId, groupPersonId, groupId],
        })

        const [placeholder] = result.rows

        if (!placeholder) {
            throw new NotFoundException('The selected placeholder is not available for claiming')
        }

        await this.database.execute({
            sql: "UPDATE GroupPerson SET claimEmail = ?, claimExpiresAt = datetime('now', '+30 days'), updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND groupId = ?",
            args: [String(placeholder[1]).toLowerCase(), groupPersonId, groupId],
        })
    }

    async deleteInvitationById(id: number) {
        const invitation = await this.database.execute({
            sql: 'SELECT groupId, groupPersonId FROM Invitation WHERE id = ?',
            args: [id],
        })
        const result = await this.database.execute({
            sql: 'DELETE FROM Invitation WHERE id = ?',
            args: [id],
        })

        const groupPersonId = invitation.rows[0]?.[1]
        const groupId = invitation.rows[0]?.[0]

        if (result.rowsAffected === 1 && groupPersonId !== null && groupPersonId !== undefined) {
            await this.database.execute({
                sql: `
                    UPDATE GroupPerson
                    SET claimEmail = NULL, claimExpiresAt = NULL, updatedAt = CURRENT_TIMESTAMP
                    WHERE id = ? AND groupId = ? AND kind = 'placeholder' AND accountId IS NULL
                      AND NOT EXISTS (
                          SELECT 1
                          FROM Invitation
                          WHERE groupPersonId = ?
                            AND (expiresAt IS NULL OR expiresAt > CURRENT_TIMESTAMP)
                      )
                `,
                args: [Number(groupPersonId), Number(groupId), Number(groupPersonId)],
            })
        }

        return result
    }

    async acceptInvitationAtomically(invitationId: number, accountId: number, groupId: number): Promise<{ success: true }> {
        const transaction = await this.database.transaction('write')

        try {
            const invitation = await transaction.execute({
                sql: `
                    SELECT id, groupPersonId
                    FROM Invitation
                    WHERE id = ?
                      AND groupId = ?
                      AND toAccountId = ?
                      AND (expiresAt IS NULL OR expiresAt > CURRENT_TIMESTAMP)
                `,
                args: [invitationId, groupId, accountId],
            })

            if (invitation.rows.length === 0) {
                throw new ForbiddenException('A pending invitation is required to join this group')
            }

            await transaction.execute({
                sql: 'INSERT OR IGNORE INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
                args: [accountId, groupId],
            })

            if (invitation.rows[0]?.[1] === null || invitation.rows[0]?.[1] === undefined) {
                await transaction.execute({
                    sql: `
                        INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, avatar, createdByAccountId, claimedAt)
                        SELECT ?, a.id, 'linked', 'active', COALESCE(NULLIF(a.displayName, ''), a.username), a.avatar, ug.createdBy, CURRENT_TIMESTAMP
                        FROM Account a
                        INNER JOIN UserGroup ug ON ug.id = ?
                        WHERE a.id = ?
                          AND NOT EXISTS (
                              SELECT 1
                              FROM GroupPerson existing
                              WHERE existing.groupId = ? AND existing.accountId = ?
                          )
                    `,
                    args: [groupId, groupId, accountId, groupId, accountId],
                })
            }

            const deletedInvitation = await transaction.execute({
                sql: `
                    DELETE FROM Invitation
                    WHERE id = ?
                      AND groupId = ?
                      AND toAccountId = ?
                `,
                args: [invitationId, groupId, accountId],
            })

            if (deletedInvitation.rowsAffected !== 1) {
                throw new NotFoundException('Invitation is no longer available')
            }

            await transaction.commit()
            return { success: true }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    deleteAllInvitationsByGroupId(groupId: number) {
        return this.database.execute({
            sql: 'DELETE FROM Invitation WHERE groupId = ?',
            args: [groupId],
        })
    }
}
