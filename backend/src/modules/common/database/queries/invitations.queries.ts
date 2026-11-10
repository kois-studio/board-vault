import { ForbiddenException, NotFoundException } from '@nestjs/common'

import { ACCOUNT_COLUMNS } from '../database.constants.js'

import { activityStatements } from './group-activity.queries.js'

import type { CreateInvitationBody, CreateInvitationByUsernameBody } from '../../../../common/types/invitation.type.js'
import type { DatabaseService } from '../database.service.js'

/**
 * An invitation that suggested a placeholder (`groupPersonId`) is not used up when accepted: it
 * stays as the claim ticket that lets that account, and only that account, claim the placeholder
 * until the invitation expires (#277). Claiming, or leaving the group, uses it up. A ticket is no
 * longer a pending invitation, so it is never listed, accepted, or declined again. Email
 * addresses play no part.
 */
const IS_PENDING = (alias: string) =>
    `(${alias}.groupPersonId IS NULL OR NOT EXISTS (SELECT 1 FROM GroupMembership pm WHERE pm.groupId = ${alias}.groupId AND pm.accountId = ${alias}.toAccountId))`

/**
 * True when the placeholder `gp` was suggested to the account bound to `?` by an invitation that
 * has not expired. The caller still checks that the account is a member and the placeholder is
 * active and unlinked.
 */
export const CLAIM_TICKET = `EXISTS (
    SELECT 1 FROM Invitation ci
    WHERE ci.groupId = gp.groupId AND ci.groupPersonId = gp.id AND ci.toAccountId = ?
      AND (ci.expiresAt IS NULL OR ci.expiresAt > CURRENT_TIMESTAMP)
)`

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
              AND ${IS_PENDING('i')}
            `,
            args: [groupId],
        })
    }

    getInvitations() {
        return this.database.execute('SELECT * FROM Invitation')
    }

    getInvitationById(id: number) {
        return this.database.execute({
            sql: `SELECT * FROM Invitation i WHERE i.id = ? AND ${IS_PENDING('i')}`,
            args: [id],
        })
    }

    getUserInvitationsReceived(accountId: number) {
        return this.database.execute({
            sql: `SELECT * FROM Invitation i WHERE i.toAccountId = ? AND (i.expiresAt IS NULL OR i.expiresAt > CURRENT_TIMESTAMP) AND ${IS_PENDING('i')}`,
            args: [accountId],
        })
    }

    getInvitationByGroupAndRecipient(groupId: number, accountId: number) {
        return this.database.execute({
            sql: `SELECT * FROM Invitation i WHERE i.groupId = ? AND i.toAccountId = ? AND (i.expiresAt IS NULL OR i.expiresAt > CURRENT_TIMESTAMP) AND ${IS_PENDING('i')}`,
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

    /** The suggested placeholder must be someone without an account who is still in the group. Nothing is written. */
    private async assertClaimableGroupPerson(groupId: number, groupPersonId: number, accountId: number): Promise<void> {
        const result = await this.database.execute({
            sql: `
                SELECT gp.id
                FROM GroupPerson gp
                INNER JOIN Account a ON a.id = ? AND a.isDeleted = 0
                WHERE gp.id = ? AND gp.groupId = ? AND gp.kind = 'placeholder'
                  AND gp.status = 'active' AND gp.accountId IS NULL
            `,
            args: [accountId, groupPersonId, groupId],
        })

        if (result.rows.length === 0) {
            throw new NotFoundException('The selected placeholder is not available for claiming')
        }
    }

    deleteInvitationById(id: number) {
        return this.database.execute({
            sql: 'DELETE FROM Invitation WHERE id = ?',
            args: [id],
        })
    }

    /** Accepts an invitation; `joined` is false when the account was already a member (the invitation is still used up). */
    async acceptInvitationAtomically(
        invitationId: number,
        accountId: number,
        groupId: number,
    ): Promise<{ success: true; joined: boolean }> {
        const transaction = await this.database.transaction('write')

        try {
            const invitation = await transaction.execute({
                sql: `
                    SELECT i.id, i.groupPersonId
                    FROM Invitation i
                    WHERE i.id = ?
                      AND i.groupId = ?
                      AND i.toAccountId = ?
                      AND (i.expiresAt IS NULL OR i.expiresAt > CURRENT_TIMESTAMP)
                      AND ${IS_PENDING('i')}
                `,
                args: [invitationId, groupId, accountId],
            })

            if (invitation.rows.length === 0) {
                throw new ForbiddenException('A pending invitation is required to join this group')
            }

            const membership = await transaction.execute({
                sql: 'INSERT OR IGNORE INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
                args: [accountId, groupId],
            })

            // Only a new membership is a join worth a history entry (ADR-0020).
            for (const statement of activityStatements(
                { groupId, actorAccountId: accountId, type: 'member_joined' },
                { onlyIfChanged: true },
            )) {
                await transaction.execute(statement)
            }

            const suggestedPersonId = invitation.rows[0]?.[1]
            // The suggested placeholder may have been claimed, archived or removed since the invitation was sent.
            const keepsTicket =
                suggestedPersonId !== null &&
                suggestedPersonId !== undefined &&
                (
                    await transaction.execute({
                        sql: `
                            SELECT 1 FROM GroupPerson
                            WHERE id = ? AND groupId = ? AND kind = 'placeholder' AND status = 'active' AND accountId IS NULL
                        `,
                        args: [Number(suggestedPersonId), groupId],
                    })
                ).rows.length === 1

            if (!keepsTicket) {
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

            // An invitation with a placeholder still to claim stays as the claim ticket; any other is used up.
            if (!keepsTicket) {
                const deletedInvitation = await transaction.execute({
                    sql: 'DELETE FROM Invitation WHERE id = ? AND groupId = ? AND toAccountId = ?',
                    args: [invitationId, groupId, accountId],
                })

                if (deletedInvitation.rowsAffected !== 1) {
                    throw new NotFoundException('Invitation is no longer available')
                }
            }

            await transaction.commit()
            return { success: true, joined: membership.rowsAffected === 1 }
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
