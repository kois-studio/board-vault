import { randomUUID } from 'node:crypto'

import { Client, createClient, type InStatement } from '@libsql/client'
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'

import type { ClerkGroupInvitationMetadata } from '../../../common/types/clerk-invitation.type'
import type { CollectionActivityDto } from '../../../common/types/collection-activity.type'
import type { GameOwnedDto, UpdateGameOwnedDto } from '../../../common/types/game-owned.type'
import type { SupportedLanguage } from '../../../common/types/game-translation.type'
import type { GroupGameInterestBody } from '../../../common/types/group-game-interest.type'
import type { CreateGroupMembershipBody } from '../../../common/types/group-membership.type'
import type { CreateGroupBody, UpdateGroupBody } from '../../../common/types/group.type'
import type { CreateInvitationBody, CreateInvitationByUsernameBody } from '../../../common/types/invitation.type'
import type { CreateNotificationBody, UpdateNotificationBody } from '../../../common/types/notification.type'
import type { CreateUserBody, UpdateUserBody, UpdateUserRecord } from '../../../common/types/user.type'
import type { MeetAccountGameQueryOptions } from '../../../modules/core/meet-account-games/meet-account-games.types'

type CompletedSessionInput = {
    groupId: number
    createdBy: number
    sessionDate: string
    timezone: string
    notes?: string
    attendeeIds: Array<number>
    games: Array<{ gameId: number; participantIds: Array<number> }>
}

type ScheduledSessionInput = {
    groupId: number
    createdBy: number
    sessionDate: string
    timezone: string
    notes?: string
    attendeeIds: Array<number>
    plannedGameIds: Array<number>
}

@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private tursoClient: Client

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        this.tursoClient = createClient({
            url: String(this.configService.get<string>('TURSO_DATABASE_URL')),
            authToken: String(this.configService.get<string>('TURSO_AUTH_TOKEN')),
        })
    }

    async checkHealth(): Promise<void> {
        await this._tursoExecute('SELECT 1')
    }

    /**
     * Use this instead of directly calling `tursoClient.execute` to log the parameterized SQL template before executing it.
     * Bound values are intentionally excluded because they may contain secrets or personal data.
     */
    private _tursoExecute(stmt: InStatement) {
        const sql = typeof stmt === 'string' ? stmt : stmt.sql

        this.LOGGER.log(sql)

        // Execute the query
        return this.tursoClient.execute(stmt)
    }

    // #region Auth

    checkEmail(email: string) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE email = ?',
            args: [email],
        })
    }

    checkUsername(username: string) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE username = ?',
            args: [username],
        })
    }

    // #region User

    getUsers() {
        return this._tursoExecute('SELECT * FROM Account')
    }

    getUserById(id: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE id = ?',
            args: [id],
        })
    }

    getUserByEmail(email: string) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE email = ?',
            args: [email],
        })
    }

    getUserByUsername(username: string) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE username = ?',
            args: [username],
        })
    }

    getUserByClerkId(clerkUserId: string) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE clerkUserId = ?',
            args: [clerkUserId],
        })
    }

    linkUserToClerkId(accountId: number, clerkUserId: string) {
        return this._tursoExecute({
            // A verified exact-email match may migrate an account from the
            // development Clerk instance to production. The identity service
            // performs that email and verification check before this update.
            sql: 'UPDATE Account SET clerkUserId = ? WHERE id = ? AND (clerkUserId IS NULL OR clerkUserId <> ?)',
            args: [clerkUserId, accountId, clerkUserId],
        })
    }

    getUserByPasswordResetToken(token: string) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE password_reset_token = ? AND password_reset_token_expires_at IS NOT NULL AND password_reset_token_expires_at > unixepoch()',
            args: [token],
        })
    }

    async resetPasswordWithToken(token: string, password: string) {
        const hashedPassword = await bcrypt.hash(password, 10)

        return this._tursoExecute({
            sql: `
                UPDATE Account
                SET password = ?, password_reset_token = NULL, password_reset_token_expires_at = NULL
                WHERE password_reset_token = ?
                  AND password_reset_token_expires_at IS NOT NULL
                  AND password_reset_token_expires_at > unixepoch()
            `,
            args: [hashedPassword, token],
        })
    }

    async createUser(userDto: CreateUserBody, verificationToken: string, verificationTokenExpiresAt?: number) {
        const { email, password, username, displayName, avatar } = userDto
        const hashedPassword = await bcrypt.hash(password, 10)

        await this._tursoExecute({
            sql: 'INSERT INTO Account (email, password, username, displayName, avatar, verification_token, verification_token_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            args: [
                email,
                hashedPassword,
                username,
                displayName,
                JSON.stringify(avatar),
                verificationToken,
                verificationTokenExpiresAt ?? null,
            ],
        })
    }

    async createClerkUser(user: { email: string; username: string; displayName: string; avatar: string; clerkUserId: string }) {
        const unusablePassword = await bcrypt.hash(`clerk:${randomUUID()}`, 10)

        return this._tursoExecute({
            sql: `
                INSERT INTO Account (
                    email,
                    password,
                    username,
                    displayName,
                    avatar,
                    email_verified,
                    verification_token,
                    password_reset_token,
                    clerkUserId
                ) VALUES (?, ?, ?, ?, ?, TRUE, NULL, NULL, ?)
            `,
            args: [user.email, unusablePassword, user.username, user.displayName, user.avatar, user.clerkUserId],
        })
    }

    async joinGroupFromClerkInvitation(accountId: number, metadata: ClerkGroupInvitationMetadata) {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const group = await transaction.execute({
                sql: 'SELECT id FROM UserGroup WHERE id = ? AND createdBy = ?',
                args: [metadata.groupId, metadata.inviterAccountId],
            })

            if (group.rows.length === 0) {
                throw new NotFoundException('The group invitation is no longer valid')
            }

            await transaction.execute({
                sql: 'INSERT OR IGNORE INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
                args: [accountId, metadata.groupId],
            })

            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    updateUserProfile(id: number, partialUserDto: UpdateUserBody) {
        const { username, displayName, avatar } = partialUserDto

        return this.updateUserRecord(id, {
            ...(username !== undefined ? { username } : {}),
            ...(displayName !== undefined ? { displayName } : {}),
            ...(avatar !== undefined ? { avatar } : {}),
        })
    }

    async updateUserRecord(id: number, partialUserDto: UpdateUserRecord) {
        // Array to store fields to update
        const fields = []
        const args = []

        // Dynamically build the update query based on the provided properties
        if (partialUserDto.email) {
            fields.push('email = ?')
            args.push(partialUserDto.email)
        }
        if (partialUserDto.password) {
            fields.push('password = ?')
            const hashedPassword = await bcrypt.hash(partialUserDto.password, 10)

            args.push(hashedPassword)
        }
        if (partialUserDto.username) {
            fields.push('username = ?')
            args.push(partialUserDto.username)
        }
        if (partialUserDto.displayName) {
            fields.push('displayName = ?')
            args.push(partialUserDto.displayName)
        }
        if (partialUserDto.avatar) {
            fields.push('avatar = ?')
            args.push(JSON.stringify(partialUserDto.avatar))
        }
        if (partialUserDto.isAdmin) {
            fields.push('isAdmin = ?')
            args.push(partialUserDto.isAdmin)
        }
        if (partialUserDto.email_verified) {
            fields.push('email_verified = ?')
            args.push(partialUserDto.email_verified)
        }
        if (partialUserDto.verification_token !== undefined) {
            fields.push('verification_token = ?')
            args.push(partialUserDto.verification_token)
        }
        if (partialUserDto.password_reset_token !== undefined) {
            fields.push('password_reset_token = ?')
            args.push(partialUserDto.password_reset_token)
        }
        if (partialUserDto.verification_token_expires_at !== undefined) {
            fields.push('verification_token_expires_at = ?')
            args.push(partialUserDto.verification_token_expires_at)
        }
        if (partialUserDto.password_reset_token_expires_at !== undefined) {
            fields.push('password_reset_token_expires_at = ?')
            args.push(partialUserDto.password_reset_token_expires_at)
        }

        // Error if no fields are provided
        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        // Add user id as the last argument
        args.push(id)

        // Construct the final query
        const sql = `
          UPDATE Account
          SET ${fields.join(', ')}
          WHERE id = ?
        `

        // Execute the query
        await this._tursoExecute({ sql, args })

        // Return the updated user
        return this.getUserById(id)
    }

    softDeleteUserById(id: number) {
        return this._tursoExecute({
            sql: 'UPDATE Account SET isDeleted = true WHERE id = ?',
            args: [id],
        })
    }

    // avoid deleting users -> soft delete instead
    deleteUserById(id: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM Account WHERE id = ?',
            args: [id],
        })
    }

    getUserReviews(userId: number) {
        return this._tursoExecute({
            sql: `
                SELECT 
                    gr.accountId,
                    gr.gameId, 
                    gr.review, 
                    gr.reviewDate 
                FROM GameReview gr
                WHERE gr.accountId = ?;
            `,
            args: [userId],
        })
    }

    async updateGames(accountId: number, gamesToAdd: number[], gamesToRemove: number[]): Promise<void> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            for (const gameId of gamesToRemove) {
                await transaction.execute({
                    sql: 'DELETE FROM OwnedGame WHERE accountId = ? AND gameId = ?',
                    args: [accountId, gameId],
                })
            }

            for (const gameId of gamesToAdd) {
                await transaction.execute({
                    sql: 'INSERT OR IGNORE INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
                    args: [accountId, gameId],
                })
            }

            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async approveGameProposalAtomically(input: {
        proposalId: number
        reviewerId: number
        title: string
        imageUrl: string
        gameAvgDuration: number
        minPlayers: number
        maxPlayers: number
        translations: Array<{ languageCode: SupportedLanguage; title: string; normalizedTitle: string }>
        tagIds: number[]
        reviewNotes?: string
        notification: CreateNotificationBody
    }): Promise<{ createdGameId: number }> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const gameResult = await transaction.execute({
                sql: 'INSERT INTO Game (imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (?, ?, ?, ?)',
                args: [input.imageUrl, input.gameAvgDuration, input.minPlayers, input.maxPlayers],
            })
            const createdGameId = Number(gameResult.lastInsertRowid)

            for (const translation of input.translations) {
                await transaction.execute({
                    sql: 'INSERT OR REPLACE INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (?, ?, ?, ?)',
                    args: [createdGameId, translation.languageCode, translation.title, translation.normalizedTitle],
                })
            }

            for (const tagId of input.tagIds) {
                await transaction.execute({
                    sql: 'INSERT OR IGNORE INTO GameTag (gameId, tagId) VALUES (?, ?)',
                    args: [createdGameId, tagId],
                })
            }

            const proposalResult = await transaction.execute({
                sql: `
                    UPDATE GameProposal
                    SET status = 'approved',
                        reviewedBy = ?,
                        reviewedAt = CURRENT_TIMESTAMP,
                        reviewNotes = ?,
                        createdGameId = ?
                    WHERE id = ? AND status = 'pending'
                `,
                args: [input.reviewerId, input.reviewNotes ?? null, createdGameId, input.proposalId],
            })

            if (proposalResult.rowsAffected !== 1) {
                throw new NotFoundException('Pending game proposal not found')
            }

            await transaction.execute({
                sql: 'INSERT INTO Notification (accountId, type, message, data) VALUES (?, ?, ?, ?)',
                args: [
                    input.notification.accountId,
                    input.notification.type,
                    input.notification.message,
                    JSON.stringify({ ...(input.notification.data || {}), createdGameId }),
                ],
            })

            await transaction.commit()
            return { createdGameId }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async rejectGameProposalAtomically(input: {
        proposalId: number
        reviewerId: number
        reviewNotes: string
        notification: CreateNotificationBody
    }): Promise<void> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const proposalResult = await transaction.execute({
                sql: `
                    UPDATE GameProposal
                    SET status = 'rejected',
                        reviewedBy = ?,
                        reviewedAt = CURRENT_TIMESTAMP,
                        reviewNotes = ?
                    WHERE id = ? AND status = 'pending'
                `,
                args: [input.reviewerId, input.reviewNotes, input.proposalId],
            })

            if (proposalResult.rowsAffected !== 1) {
                throw new NotFoundException('Pending game proposal not found')
            }

            await transaction.execute({
                sql: 'INSERT INTO Notification (accountId, type, message, data) VALUES (?, ?, ?, ?)',
                args: [
                    input.notification.accountId,
                    input.notification.type,
                    input.notification.message,
                    JSON.stringify(input.notification.data || {}),
                ],
            })

            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async findUserByVerificationToken(token: string) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE verification_token = ? AND verification_token_expires_at IS NOT NULL AND verification_token_expires_at > unixepoch()',
            args: [token],
        })
    }

    verifyEmailToken(token: string) {
        return this._tursoExecute({
            sql: `
                UPDATE Account
                SET email_verified = TRUE, verification_token = NULL, verification_token_expires_at = NULL
                WHERE verification_token = ?
                  AND verification_token_expires_at IS NOT NULL
                  AND verification_token_expires_at > unixepoch()
            `,
            args: [token],
        })
    }

    // #region Group

    getGroupsForAccount(accountId: number) {
        return this._tursoExecute({
            sql: `
                SELECT DISTINCT ug.*
                FROM UserGroup ug
                LEFT JOIN GroupMembership gm ON gm.groupId = ug.id
                WHERE ug.createdBy = ? OR gm.accountId = ?
            `,
            args: [accountId, accountId],
        })
    }

    getGroupById(id: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM UserGroup WHERE id = ?',
            args: [id],
        })
    }

    getGroupByName(name: string) {
        return this._tursoExecute({
            sql: 'SELECT * FROM UserGroup WHERE name = ?',
            args: [name],
        })
    }

    async createGroup(groupDto: CreateGroupBody) {
        await this._tursoExecute({
            sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?)',
            args: [groupDto.name, groupDto.createdBy],
        })
    }

    async createGroupWithMembership(groupDto: CreateGroupBody) {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const groupResult = await transaction.execute({
                sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?)',
                args: [groupDto.name, groupDto.createdBy],
            })
            const groupId = Number(groupResult.lastInsertRowid)

            await transaction.execute({
                sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
                args: [groupDto.createdBy, groupId],
            })

            await transaction.commit()
            return { groupId }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async updateGroup(id: number, partialGroupDto: UpdateGroupBody) {
        // Array to store fields to update
        const fields = []
        const args = []

        // Dynamically build the update query based on the provided properties
        if (partialGroupDto.name) {
            fields.push('name = ?')
            args.push(partialGroupDto.name)
        }

        // Error if no fields are provided
        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        // Add user id as the last argument
        args.push(id)

        // Construct the final query
        const sql = `
          UPDATE UserGroup
          SET ${fields.join(', ')}
          WHERE id = ?
        `

        // Execute the query
        await this._tursoExecute({ sql, args })

        // Return the updated user
        return this.getGroupById(id)
    }

    deleteGroupById(id: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM UserGroup WHERE id = ?',
            args: [id],
        })
    }

    getGroupInvitations(groupId: number) {
        return this._tursoExecute({
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

    // #region Membership

    getGroupMemberships() {
        return this._tursoExecute('SELECT * FROM GroupMembership')
    }

    getGroupMembershipById(accountId: number, groupId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM GroupMembership WHERE accountId = ? AND groupId = ?',
            args: [accountId, groupId],
        })
    }

    getGroupMembershipsByAccountId(accountId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM GroupMembership WHERE accountId = ?',
            args: [accountId],
        })
    }

    getGroupMembershipsByGroupId(groupId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM GroupMembership WHERE groupId = ?',
            args: [groupId],
        })
    }

    async getGroupMemberIds(groupId: number): Promise<Array<number>> {
        const resultSet = await this._tursoExecute({
            sql: 'SELECT accountId FROM GroupMembership WHERE groupId = ?',
            args: [groupId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getGroupAvailableGameIds(groupId: number): Promise<Array<number>> {
        const resultSet = await this._tursoExecute({
            sql: `
                SELECT DISTINCT og.gameId
                FROM OwnedGame og
                INNER JOIN GroupMembership gm ON gm.accountId = og.accountId
                WHERE gm.groupId = ?
            `,
            args: [groupId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    getGroupAcquisitionBoard(groupId: number) {
        return this._tursoExecute({
            sql: `
                SELECT
                    g.id,
                    g.imageUrl,
                    g.gameAvgDuration,
                    g.minPlayers,
                    g.maxPlayers,
                    gt_en.title,
                    gt_es.title,
                    (
                        SELECT MIN(ggi_first.createdAt)
                        FROM GroupGameInterest ggi_first
                        WHERE ggi_first.groupId = ? AND ggi_first.gameId = g.id
                    ) AS firstInterestedAt,
                    a.id,
                    a.username,
                    a.displayName,
                    a.avatar,
                    (
                        SELECT COUNT(DISTINCT ggi_count.accountId)
                        FROM GroupGameInterest ggi_count
                        WHERE ggi_count.groupId = ? AND ggi_count.gameId = g.id
                    ) AS interestCount,
                    (
                        SELECT COUNT(DISTINCT og.accountId)
                        FROM OwnedGame og
                        INNER JOIN GroupMembership gm ON gm.accountId = og.accountId
                        WHERE gm.groupId = ? AND og.gameId = g.id
                    ) AS ownerCount,
                    gad.status,
                    gad.decidedAt,
                    decisionAccount.id,
                    decisionAccount.username,
                    decisionAccount.displayName,
                    decisionAccount.avatar
                FROM GroupGameInterest ggi
                INNER JOIN Game g ON g.id = ggi.gameId
                INNER JOIN Account a ON a.id = ggi.accountId
                LEFT JOIN GameTranslation gt_en ON gt_en.gameId = g.id AND gt_en.languageCode = 'en'
                LEFT JOIN GameTranslation gt_es ON gt_es.gameId = g.id AND gt_es.languageCode = 'es'
                LEFT JOIN GroupAcquisitionDecision gad ON gad.groupId = ggi.groupId AND gad.gameId = ggi.gameId
                LEFT JOIN Account decisionAccount ON decisionAccount.id = gad.decidedBy AND decisionAccount.isDeleted = 0
                WHERE ggi.groupId = ?
                    AND NOT EXISTS (
                        SELECT 1
                        FROM OwnedGame ownedByGroupMember
                        INNER JOIN GroupMembership groupMember ON groupMember.accountId = ownedByGroupMember.accountId
                        WHERE groupMember.groupId = ggi.groupId AND ownedByGroupMember.gameId = ggi.gameId
                    )
                ORDER BY firstInterestedAt ASC, g.id ASC, a.displayName ASC
            `,
            args: [groupId, groupId, groupId, groupId],
        })
    }

    addGroupGameInterest(groupId: number, accountId: number, body: GroupGameInterestBody) {
        return this._tursoExecute({
            sql: `
                INSERT OR IGNORE INTO GroupGameInterest (groupId, accountId, gameId)
                SELECT ?, ?, ?
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM OwnedGame ownedByGroupMember
                    INNER JOIN GroupMembership groupMember ON groupMember.accountId = ownedByGroupMember.accountId
                    WHERE groupMember.groupId = ? AND ownedByGroupMember.gameId = ?
                )
            `,
            args: [groupId, accountId, body.gameId, groupId, body.gameId],
        })
    }

    async addGroupGameInterestAndReopenDecision(groupId: number, accountId: number, gameId: number): Promise<{ rowsAffected: number }> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const interest = await transaction.execute({
                sql: `
                    INSERT OR IGNORE INTO GroupGameInterest (groupId, accountId, gameId)
                    SELECT ?, ?, ?
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM OwnedGame ownedByGroupMember
                        INNER JOIN GroupMembership groupMember ON groupMember.accountId = ownedByGroupMember.accountId
                        WHERE groupMember.groupId = ? AND ownedByGroupMember.gameId = ?
                    )
                `,
                args: [groupId, accountId, gameId, groupId, gameId],
            })

            if (interest.rowsAffected === 1) {
                await transaction.execute({
                    sql: `
                        UPDATE GroupAcquisitionDecision
                        SET status = 'open', decidedBy = NULL, decidedAt = NULL, note = NULL
                        WHERE groupId = ? AND gameId = ? AND status = 'not_now'
                    `,
                    args: [groupId, gameId],
                })
            }

            await transaction.commit()
            return { rowsAffected: interest.rowsAffected }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    upsertGroupAcquisitionDecision(
        groupId: number,
        gameId: number,
        decidedBy: number,
        status: 'open' | 'planned' | 'not_now',
        note: string | null,
    ) {
        return this._tursoExecute({
            sql: `
                INSERT INTO GroupAcquisitionDecision (groupId, gameId, status, decidedBy, note)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(groupId, gameId) DO UPDATE SET
                    status = excluded.status,
                    decidedBy = excluded.decidedBy,
                    decidedAt = CURRENT_TIMESTAMP,
                    note = excluded.note
            `,
            args: [groupId, gameId, status, decidedBy, note],
        })
    }

    reopenGroupAcquisitionDecision(groupId: number, gameId: number) {
        return this._tursoExecute({
            sql: `
                UPDATE GroupAcquisitionDecision
                SET status = 'open', decidedBy = NULL, decidedAt = NULL, note = NULL
                WHERE groupId = ? AND gameId = ? AND status = 'not_now'
            `,
            args: [groupId, gameId],
        })
    }

    removeGroupGameInterest(groupId: number, accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM GroupGameInterest WHERE groupId = ? AND accountId = ? AND gameId = ?',
            args: [groupId, accountId, gameId],
        })
    }

    getOwnedGameByAnyAccount(gameId: number, accountIds: Array<number>) {
        const placeholders = accountIds.map(() => '?').join(', ')

        return this._tursoExecute({
            sql: `SELECT 1 FROM OwnedGame WHERE gameId = ? AND accountId IN (${placeholders}) LIMIT 1`,
            args: [gameId, ...accountIds],
        })
    }

    getRecommendationCandidateCounts(attendeeIds: Array<number>, playerCount: number, availableMinutes?: number) {
        const placeholders = attendeeIds.map(() => '?').join(', ')
        const durationExpression = availableMinutes === undefined ? '1' : '(g.gameAvgDuration IS NULL OR g.gameAvgDuration <= ?)'
        const args: Array<number> = [playerCount, playerCount, playerCount, playerCount]

        if (availableMinutes !== undefined) args.push(availableMinutes)
        args.push(...attendeeIds)

        return this._tursoExecute({
            sql: `
                SELECT
                    COUNT(DISTINCT g.id) AS ownedGameCount,
                    COUNT(DISTINCT CASE WHEN (g.minPlayers IS NULL OR g.minPlayers <= ?)
                        AND (g.maxPlayers IS NULL OR g.maxPlayers >= ?) THEN g.id END) AS playerFitCount,
                    COUNT(DISTINCT CASE WHEN (g.minPlayers IS NULL OR g.minPlayers <= ?)
                        AND (g.maxPlayers IS NULL OR g.maxPlayers >= ?)
                        AND ${durationExpression} THEN g.id END) AS durationFitCount
                FROM Game g
                INNER JOIN OwnedGame og ON og.gameId = g.id
                    AND og.accountId IN (${placeholders})
            `,
            args,
        })
    }

    createRecommendationFeedback(input: {
        accountId: number
        groupId: number
        gameId: number
        attendeeIds: string
        feedback: 'interested' | 'not_for_us' | 'played'
    }) {
        return this._tursoExecute({
            sql: `
                INSERT INTO RecommendationFeedback (accountId, groupId, gameId, attendeeIds, feedback)
                VALUES (?, ?, ?, ?, ?)
            `,
            args: [input.accountId, input.groupId, input.gameId, input.attendeeIds, input.feedback],
        })
    }

    getRecommendationFeedbackForGroup(groupId: number) {
        return this._tursoExecute({
            sql: `
                SELECT
                    rf.id,
                    rf.gameId,
                    rf.accountId,
                    rf.feedback,
                    rf.createdAt,
                    a.username,
                    a.displayName,
                    a.avatar
                FROM RecommendationFeedback rf
                INNER JOIN GroupMembership gm
                    ON gm.groupId = rf.groupId AND gm.accountId = rf.accountId
                INNER JOIN Account a ON a.id = rf.accountId AND a.isDeleted = FALSE
                WHERE rf.groupId = ?
                ORDER BY rf.createdAt DESC, rf.id DESC
            `,
            args: [groupId],
        })
    }

    getRecommendationCandidates(attendeeIds: Array<number>, playerCount: number, availableMinutes?: number) {
        const attendeePlaceholders = attendeeIds.map(() => '?').join(', ')
        const durationFilter = availableMinutes === undefined ? '' : 'AND (g.gameAvgDuration IS NULL OR g.gameAvgDuration <= ?)'
        const args: Array<number> = [...attendeeIds, playerCount, playerCount]

        if (availableMinutes !== undefined) {
            args.push(availableMinutes)
        }

        return this._tursoExecute({
            sql: `
                SELECT
                    g.id,
                    g.imageUrl,
                    g.gameAvgDuration,
                    g.minPlayers,
                    g.maxPlayers,
                    gt_en.title,
                    gt_es.title,
                    (
                        SELECT COUNT(DISTINCT og.accountId)
                        FROM OwnedGame og
                        WHERE og.gameId = g.id AND og.accountId IN (${attendeePlaceholders})
                    ) AS ownerCount,
                    (
                        SELECT AVG(gr.review)
                        FROM GameReview gr
                        WHERE gr.gameId = g.id AND gr.accountId IN (${attendeePlaceholders})
                    ) AS averageReview,
                    (
                        SELECT MAX(m.meetDate)
                        FROM MeetGame mg
                        INNER JOIN Meet m ON m.id = mg.meetId
                        WHERE mg.gameId = g.id
                          AND mg.gameStatus = 'played'
                          AND m.status = 'completed'
                          AND (
                              EXISTS (
                                  SELECT 1
                                  FROM MeetAttendee ma
                                  WHERE ma.meetId = m.id
                                    AND ma.accountId IN (${attendeePlaceholders})
                                    AND ma.attendanceStatus = 'attended'
                              )
                              OR EXISTS (
                                  SELECT 1
                                  FROM MeetAccountGame mag
                                  WHERE mag.meetId = m.id
                                    AND mag.gameId = g.id
                                    AND mag.accountId IN (${attendeePlaceholders})
                              )
                          )
                    ) AS lastPlayedAt
                FROM Game g
                INNER JOIN OwnedGame ownedByAttendee
                    ON ownedByAttendee.gameId = g.id
                   AND ownedByAttendee.accountId IN (${attendeePlaceholders})
                LEFT JOIN GameTranslation gt_en
                    ON gt_en.gameId = g.id AND gt_en.languageCode = 'en'
                LEFT JOIN GameTranslation gt_es
                    ON gt_es.gameId = g.id AND gt_es.languageCode = 'es'
                WHERE (g.minPlayers IS NULL OR g.minPlayers <= ?)
                  AND (g.maxPlayers IS NULL OR g.maxPlayers >= ?)
                  AND COALESCE(gt_en.title, gt_es.title) IS NOT NULL
                  ${durationFilter}
                GROUP BY g.id
            `,
            args: [...attendeeIds, ...attendeeIds, ...attendeeIds, ...attendeeIds, ...attendeeIds, ...args.slice(attendeeIds.length)],
        })
    }

    async createGroupMembership(groupDto: CreateGroupMembershipBody) {
        await this._tursoExecute({
            sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
            args: [groupDto.accountId, groupDto.groupId],
        })
    }

    deleteGroupMembershipById(accountId: number, groupId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM GroupMembership WHERE accountId = ? AND groupId = ?',
            args: [accountId, groupId],
        })
    }

    deleteAllGroupMembershipByGroupId(groupId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM GroupMembership WHERE groupId = ?',
            args: [groupId],
        })
    }

    // #region Game

    getGameById(id: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Game WHERE id = ?',
            args: [id],
        })
    }

    getGames() {
        return this._tursoExecute('SELECT * FROM Game ORDER BY id')
    }

    async createGame(gameData: { title: string; imageUrl: string; gameAvgDuration: number; minPlayers: number; maxPlayers: number }) {
        await this._tursoExecute({
            sql: 'INSERT INTO Game (imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (?, ?, ?, ?)',
            args: [gameData.imageUrl, gameData.gameAvgDuration, gameData.minPlayers, gameData.maxPlayers],
        })
    }

    // #region GameTranslation

    getGameTranslations(gameId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM GameTranslation WHERE gameId = ?',
            args: [gameId],
        })
    }

    createGameTranslation(gameId: number, languageCode: string, title: string, normalizedTitle: string) {
        return this._tursoExecute({
            sql: 'INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (?, ?, ?, ?)',
            args: [gameId, languageCode, title, normalizedTitle],
        })
    }

    upsertGameTranslation(gameId: number, languageCode: string, title: string, normalizedTitle: string) {
        return this._tursoExecute({
            sql: 'INSERT OR REPLACE INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (?, ?, ?, ?)',
            args: [gameId, languageCode, title, normalizedTitle],
        })
    }

    browseGames(options: { search: string; skip: number; take: number; excludeGameIds: number[]; languageCode: SupportedLanguage }) {
        const { search, skip, take, excludeGameIds, languageCode } = options

        // Building the query parts
        const whereConditions = []
        const queryArgs: any[] = []

        // Add language condition (always included)
        whereConditions.push('languageCode = ?')
        queryArgs.push(languageCode)

        // Add search condition if provided
        if (search && search.trim() !== '') {
            whereConditions.push('normalizedTitle LIKE ?')
            queryArgs.push(`%${search}%`)
        }

        // Add exclusion condition if game IDs to exclude are provided
        if (excludeGameIds.length > 0) {
            whereConditions.push(`gameId NOT IN (${excludeGameIds.map(() => '?').join(', ')})`)
            queryArgs.push(...excludeGameIds)
        }

        // Combine WHERE conditions if any
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

        // Main query for fetching games with pagination
        const sql = `
            SELECT * FROM GameTranslation 
            ${whereClause}
            ORDER BY title ASC
            LIMIT ? OFFSET ?
        `

        // Add pagination params
        queryArgs.push(take, skip)

        return this._tursoExecute({
            sql,
            args: queryArgs,
        })
    }

    countGames(options: { search: string; excludeGameIds: number[]; languageCode: SupportedLanguage }) {
        const { search, excludeGameIds, languageCode } = options

        // Building the query parts
        const whereConditions = []
        const queryArgs: any[] = []

        // Add language condition (always included)
        whereConditions.push('languageCode = ?')
        queryArgs.push(languageCode)

        // Add search condition if provided
        if (search && search.trim() !== '') {
            whereConditions.push('normalizedTitle LIKE ?')
            queryArgs.push(`%${search}%`)
        }

        // Add exclusion condition if game IDs to exclude are provided
        if (excludeGameIds.length > 0) {
            whereConditions.push(`gameId NOT IN (${excludeGameIds.map(() => '?').join(', ')})`)
            queryArgs.push(...excludeGameIds)
        }

        // Combine WHERE conditions if any
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

        // Query for counting total games matching criteria
        // Using COUNT(DISTINCT gameId) to count unique games, not translations
        const sql = `
            SELECT COUNT(DISTINCT gameId) as total FROM GameTranslation
            ${whereClause}
        `

        return this._tursoExecute({
            sql,
            args: queryArgs,
        })
    }

    browseGamesMultiLanguage(options: { search: string; skip: number; take: number; excludeGameIds: number[] }) {
        const { search, skip, take, excludeGameIds } = options

        // Building the query parts
        const whereConditions = []
        const queryArgs: any[] = []

        // Add search condition if provided
        if (search && search.trim() !== '') {
            whereConditions.push('normalizedTitle LIKE ?')
            queryArgs.push(`%${search}%`)
        }

        // Add exclusion condition if game IDs to exclude are provided
        if (excludeGameIds.length > 0) {
            whereConditions.push(`gameId NOT IN (${excludeGameIds.map(() => '?').join(', ')})`)
            queryArgs.push(...excludeGameIds)
        }

        // Combine WHERE conditions if any
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

        // Main query for fetching games with pagination
        // Using DISTINCT to avoid duplicates when a game has translations in multiple languages
        const sql = `
            SELECT DISTINCT gameId FROM GameTranslation 
            ${whereClause}
            ORDER BY gameId ASC
            LIMIT ? OFFSET ?
        `

        // Add pagination params
        queryArgs.push(take, skip)

        return this._tursoExecute({
            sql,
            args: queryArgs,
        })
    }

    countGamesMultiLanguage(options: { search: string; excludeGameIds: number[] }) {
        const { search, excludeGameIds } = options

        // Building the query parts
        const whereConditions = []
        const queryArgs: any[] = []

        // Add search condition if provided
        if (search && search.trim() !== '') {
            whereConditions.push('normalizedTitle LIKE ?')
            queryArgs.push(`%${search}%`)
        }

        // Add exclusion condition if game IDs to exclude are provided
        if (excludeGameIds.length > 0) {
            whereConditions.push(`gameId NOT IN (${excludeGameIds.map(() => '?').join(', ')})`)
            queryArgs.push(...excludeGameIds)
        }

        // Combine WHERE conditions if any
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

        // Query for counting total games matching criteria
        // Using COUNT(DISTINCT gameId) to count unique games, not translations
        const sql = `
            SELECT COUNT(DISTINCT gameId) as total FROM GameTranslation
            ${whereClause}
        `

        return this._tursoExecute({
            sql,
            args: queryArgs,
        })
    }

    // #region OwnedGame

    getOwnedGames() {
        return this._tursoExecute('SELECT * FROM OwnedGame')
    }

    getGameOwnedByAccountIdAndGameId(accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM OwnedGame WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    getOwnedGamesByAccountId(accountId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM OwnedGame WHERE accountId = ?',
            args: [accountId],
        })
    }

    isGameIdOwnedByAccountId(accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM OwnedGame WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    async createOwnedGame(groupDto: GameOwnedDto) {
        await this._tursoExecute({
            sql: 'INSERT INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
            args: [groupDto.accountId, groupDto.gameId],
        })
    }

    async addGameToCollection(accountId: number, gameId: number): Promise<{ success: boolean; wishlistRemoved: boolean }> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const ownedGame = await transaction.execute({
                sql: 'INSERT OR IGNORE INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
                args: [accountId, gameId],
            })

            if (ownedGame.rowsAffected !== 1) {
                await transaction.commit()
                return { success: false, wishlistRemoved: false }
            }

            await transaction.execute({
                sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                args: [accountId, gameId, 'added', null],
            })

            const wishlist = await transaction.execute({
                sql: 'SELECT 1 FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
                args: [accountId, gameId],
            })
            const wishlistRemoved = wishlist.rows.length > 0

            if (wishlistRemoved) {
                await transaction.execute({
                    sql: 'DELETE FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
                    args: [accountId, gameId],
                })
                await transaction.execute({
                    sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                    args: [accountId, gameId, 'unwishlisted', null],
                })
            }

            // Keep the bounded activity-memory policy inside the same transaction
            // as the writes that produced the events.
            await transaction.execute({
                sql: `
                    DELETE FROM CollectionActivity
                    WHERE accountId = ?
                      AND id NOT IN (
                          SELECT id FROM CollectionActivity
                          WHERE accountId = ?
                          ORDER BY id DESC
                          LIMIT 32
                      )
                `,
                args: [accountId, accountId],
            })

            await transaction.commit()
            return { success: true, wishlistRemoved }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async removeGameFromCollection(accountId: number, gameId: number): Promise<{ rowsAffected: number }> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const ownedGame = await transaction.execute({
                sql: 'DELETE FROM OwnedGame WHERE accountId = ? AND gameId = ?',
                args: [accountId, gameId],
            })

            if (ownedGame.rowsAffected !== 1) {
                await transaction.commit()
                return { rowsAffected: 0 }
            }

            await transaction.execute({
                sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                args: [accountId, gameId, 'removed', null],
            })
            await transaction.execute({
                sql: `
                    DELETE FROM CollectionActivity
                    WHERE accountId = ?
                      AND id NOT IN (
                          SELECT id FROM CollectionActivity
                          WHERE accountId = ?
                          ORDER BY id DESC
                          LIMIT 32
                      )
                `,
                args: [accountId, accountId],
            })

            await transaction.commit()
            return { rowsAffected: 1 }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async updateGameOwnershipAndLogActivity(
        accountId: number,
        gameId: number,
        ownedGameDto: UpdateGameOwnedDto,
    ): Promise<{ rowsAffected: number }> {
        const fields: Array<string> = []
        const args: Array<string | number | null> = []

        if (ownedGameDto.purchaseDate !== undefined) {
            fields.push('purchaseDate = ?')
            args.push(ownedGameDto.purchaseDate)
        }

        if (ownedGameDto.purchaseNotes !== undefined) {
            fields.push('purchaseNotes = ?')
            args.push(ownedGameDto.purchaseNotes)
        }

        if (ownedGameDto.purchasePrice !== undefined) {
            fields.push('purchasePrice = ?')
            args.push(ownedGameDto.purchasePrice)
        }

        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        const transaction = await this.tursoClient.transaction('write')

        try {
            const ownedGame = await transaction.execute({
                sql: `UPDATE OwnedGame SET ${fields.join(', ')} WHERE accountId = ? AND gameId = ?`,
                args: [...args, accountId, gameId],
            })

            if (ownedGame.rowsAffected !== 1) {
                await transaction.commit()
                return { rowsAffected: 0 }
            }

            await transaction.execute({
                sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                args: [accountId, gameId, 'updated', null],
            })
            await transaction.execute({
                sql: `
                    DELETE FROM CollectionActivity
                    WHERE accountId = ?
                      AND id NOT IN (
                          SELECT id FROM CollectionActivity
                          WHERE accountId = ?
                          ORDER BY id DESC
                          LIMIT 32
                      )
                `,
                args: [accountId, accountId],
            })

            await transaction.commit()
            return { rowsAffected: 1 }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async toggleWishlistAndLogActivity(accountId: number, gameId: number): Promise<boolean> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const wishlist = await transaction.execute({
                sql: 'SELECT 1 FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
                args: [accountId, gameId],
            })
            const isWishlisted = wishlist.rows.length > 0

            await transaction.execute({
                sql: isWishlisted
                    ? 'DELETE FROM WishlistedGame WHERE accountId = ? AND gameId = ?'
                    : 'INSERT INTO WishlistedGame (accountId, gameId) VALUES (?, ?)',
                args: [accountId, gameId],
            })
            await transaction.execute({
                sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                args: [accountId, gameId, isWishlisted ? 'unwishlisted' : 'wishlisted', null],
            })
            await transaction.execute({
                sql: `
                    DELETE FROM CollectionActivity
                    WHERE accountId = ?
                      AND id NOT IN (
                          SELECT id FROM CollectionActivity
                          WHERE accountId = ?
                          ORDER BY id DESC
                          LIMIT 32
                      )
                `,
                args: [accountId, accountId],
            })

            await transaction.commit()
            return !isWishlisted
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async saveGameReviewAndLogActivity(accountId: number, gameId: number, review: number): Promise<{ success: true }> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            await transaction.execute({
                sql: 'DELETE FROM GameReview WHERE accountId = ? AND gameId = ?',
                args: [accountId, gameId],
            })
            await transaction.execute({
                sql: 'INSERT INTO GameReview (accountId, gameId, review) VALUES (?, ?, ?)',
                args: [accountId, gameId, review],
            })
            await transaction.execute({
                sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                args: [accountId, gameId, 'rated', JSON.stringify({ rating: review })],
            })
            await transaction.execute({
                sql: `
                    DELETE FROM CollectionActivity
                    WHERE accountId = ?
                      AND id NOT IN (
                          SELECT id FROM CollectionActivity
                          WHERE accountId = ?
                          ORDER BY id DESC
                          LIMIT 32
                      )
                `,
                args: [accountId, accountId],
            })

            await transaction.commit()
            return { success: true }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    updateGameOwned(accountId: number, gameId: number, ownedGameDto: UpdateGameOwnedDto) {
        const fields = []
        const args = []

        // we allow update to `null` values
        if (ownedGameDto.purchaseDate !== undefined) {
            fields.push('purchaseDate = ?')
            args.push(ownedGameDto.purchaseDate)
        }

        if (ownedGameDto.purchaseNotes !== undefined) {
            fields.push('purchaseNotes = ?')
            args.push(ownedGameDto.purchaseNotes)
        }

        if (ownedGameDto.purchasePrice !== undefined) {
            fields.push('purchasePrice = ?')
            args.push(ownedGameDto.purchasePrice)
        }

        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        args.push(accountId, gameId)

        const sql = `
          UPDATE OwnedGame
          SET ${fields.join(', ')}
          WHERE accountId = ? AND gameId = ?
        `

        return this._tursoExecute({ sql, args })
    }

    deleteOwnedGameById(accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM OwnedGame WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    // #region Invitation

    getInvitations() {
        return this._tursoExecute('SELECT * FROM Invitation')
    }

    getInvitationById(id: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Invitation WHERE id = ?',
            args: [id],
        })
    }

    getUserInvitationsReceived(accountId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Invitation WHERE toAccountId = ? AND (expiresAt IS NULL OR expiresAt > CURRENT_TIMESTAMP)',
            args: [accountId],
        })
    }

    getInvitationByGroupAndRecipient(groupId: number, accountId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Invitation WHERE groupId = ? AND toAccountId = ? AND (expiresAt IS NULL OR expiresAt > CURRENT_TIMESTAMP)',
            args: [groupId, accountId],
        })
    }

    async createInvitation(invitationDto: CreateInvitationBody) {
        await this._tursoExecute({
            sql: "INSERT INTO Invitation (groupId, fromAccountId, toAccountId, expiresAt) VALUES (?, ?, ?, datetime('now', '+30 days'))",
            args: [invitationDto.groupId, invitationDto.fromAccountId, invitationDto.toAccountId],
        })
    }

    async createInvitationByUsername(invitationDto: CreateInvitationByUsernameBody) {
        const toAccount = await this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE username = ? AND isDeleted = 0',
            args: [invitationDto.username],
        })

        if (toAccount.rows.length === 0) {
            throw new NotFoundException('User not found')
        }

        await this._tursoExecute({
            sql: "INSERT INTO Invitation (groupId, fromAccountId, toAccountId, expiresAt) VALUES (?, ?, ?, datetime('now', '+30 days'))",
            args: [invitationDto.groupId, invitationDto.fromAccountId, toAccount.rows[0].id],
        })

        // return the invited user
        return toAccount.rows[0]
    }

    deleteInvitationById(id: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM Invitation WHERE id = ?',
            args: [id],
        })
    }

    async acceptInvitationAtomically(invitationId: number, accountId: number, groupId: number): Promise<{ success: true }> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const invitation = await transaction.execute({
                sql: `
                    SELECT id
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
        return this._tursoExecute({
            sql: 'DELETE FROM Invitation WHERE groupId = ?',
            args: [groupId],
        })
    }

    // #region Notification

    getNotifications() {
        return this._tursoExecute('SELECT * FROM Notification')
    }

    getNotificationById(id: number, accountId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Notification WHERE id = ? AND accountId = ?',
            args: [id, accountId],
        })
    }

    getNotificationsByAccountId(accountId: number) {
        return this._tursoExecute({
            sql: `
                SELECT n.id, n.accountId, n.type, n.message, n.data, n.createdAt, n.isRead
                FROM Notification n
                WHERE n.accountId = ?
            `,
            args: [accountId],
        })
    }

    createNotification(notificationDto: CreateNotificationBody) {
        // Serialize data to JSON string for storage
        const dataJson = JSON.stringify(notificationDto.data || {})

        return this._tursoExecute({
            sql: 'INSERT INTO Notification (accountId, type, message, data) VALUES (?, ?, ?, ?)',
            args: [notificationDto.accountId, notificationDto.type, notificationDto.message, dataJson],
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
        return this._tursoExecute({ sql, args })
    }

    deleteNotificationById(id: number, accountId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM Notification WHERE id = ? AND accountId = ?',
            args: [id, accountId],
        })
    }

    // #region GameReview

    getGameReviews() {
        return this._tursoExecute('SELECT * FROM GameReview')
    }

    getGameReviewById(accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM GameReview WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    getGameReviewsByAccountId(accountId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM GameReview WHERE accountId = ?',
            args: [accountId],
        })
    }

    createGameReview(accountId: number, gameId: number, review: number) {
        return this._tursoExecute({
            sql: 'INSERT INTO GameReview (accountId, gameId, review) VALUES (?, ?, ?)',
            args: [accountId, gameId, review],
        })
    }

    deleteGameReviewById(accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM GameReview WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    getAvgGlobalRating(gameId: number) {
        return this._tursoExecute({
            sql: `
            SELECT
                AVG(review) as avgGlobalRating,
                COUNT(review) as count
            FROM GameReview
            WHERE gameId = ?`,
            args: [gameId],
        })
    }

    // The average rating of the game from the groups the user is a member of
    getAvgGroupsRating(accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: `
            SELECT
                AVG(gr.review) AS avgGroupsRating,
                COUNT(gr.review) AS count
            FROM GameReview gr
            JOIN GroupMembership gm ON gr.accountId = gm.accountId  -- Link review to group membership
            JOIN GroupMembership gm2 ON gm.groupId = gm2.groupId  -- Find groups user is also in
            WHERE gm2.accountId = ?  -- Filter: user must be in the same group
            AND gr.gameId = ?;  -- Filter: only for the specific game`,
            args: [accountId, gameId],
        })
    }

    // #region CollectionActivity

    getUserCollectionActivities(accountId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM CollectionActivity WHERE accountId = ?',
            args: [accountId],
        })
    }

    deleteCollectionActivityById(activityId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM CollectionActivity WHERE id = ?',
            args: [activityId],
        })
    }

    createCollectionActivity(collectionActivityDto: Omit<CollectionActivityDto, 'id'>) {
        return this._tursoExecute({
            sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
            args: [
                collectionActivityDto.accountId,
                collectionActivityDto.gameId,
                collectionActivityDto.actionType,
                collectionActivityDto.actionDetails ? JSON.stringify(collectionActivityDto.actionDetails) : null,
            ],
        })
    }

    // #region Meetings

    getMeetsForAccount(accountId: number) {
        return this._tursoExecute({
            sql: `
                SELECT DISTINCT m.id, m.groupId, m.createdBy, m.meetDate, m.isConfirmed,
                    m.status, m.timezone, m.notes
                FROM Meet m
                INNER JOIN GroupMembership gm ON gm.groupId = m.groupId
                WHERE gm.accountId = ?
            `,
            args: [accountId],
        })
    }

    getMeetByIdForAccount(meetId: number, accountId: number) {
        return this._tursoExecute({
            sql: `
                SELECT m.id, m.groupId, m.createdBy, m.meetDate, m.isConfirmed,
                    m.status, m.timezone, m.notes
                FROM Meet m
                INNER JOIN GroupMembership gm ON gm.groupId = m.groupId
                WHERE m.id = ? AND gm.accountId = ?
            `,
            args: [meetId, accountId],
        })
    }

    getMeetByIdForCreator(meetId: number, accountId: number) {
        return this._tursoExecute({
            sql: `
                SELECT m.id, m.groupId, m.createdBy, m.meetDate, m.isConfirmed,
                    m.status, m.timezone, m.notes
                FROM Meet m
                INNER JOIN GroupMembership gm ON gm.groupId = m.groupId AND gm.accountId = ?
                WHERE m.id = ? AND m.createdBy = ?
            `,
            args: [accountId, meetId, accountId],
        })
    }

    async updateMeetStatus(
        meetId: number,
        expectedStatus: 'scheduled' | 'active' | 'completed' | 'cancelled',
        status: 'scheduled' | 'active' | 'completed' | 'cancelled',
    ) {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const result = await transaction.execute({
                sql: `
                    UPDATE Meet
                    SET status = ?, isConfirmed = ?, updatedAt = CURRENT_TIMESTAMP
                    WHERE id = ? AND status = ?
                `,
                args: [status, status === 'completed' || status === 'cancelled', meetId, expectedStatus],
            })

            if (result.rowsAffected === 1 && (status === 'completed' || status === 'cancelled')) {
                await transaction.execute({
                    sql: `
                        UPDATE MeetGame
                        SET gameStatus = 'skipped'
                        WHERE meetId = ? AND gameStatus = 'planned'
                    `,
                    args: [meetId],
                })
            }

            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async replaceMeetPlannedGames(meetId: number, gameIds: Array<number>, expectedStatus: 'scheduled' | 'active'): Promise<boolean> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const statusGuard = await transaction.execute({
                sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
                args: [meetId, expectedStatus],
            })

            if (statusGuard.rowsAffected !== 1) {
                await transaction.commit()
                return false
            }

            await transaction.execute({
                sql: "DELETE FROM MeetGame WHERE meetId = ? AND gameStatus = 'planned'",
                args: [meetId],
            })
            if (gameIds.length > 0) {
                await transaction.batch(
                    gameIds.map(gameId => ({
                        sql: "INSERT OR IGNORE INTO MeetGame (meetId, gameId, gameStatus) VALUES (?, ?, 'planned')",
                        args: [meetId, gameId],
                    })),
                )
            }
            await transaction.commit()
            return true
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async replaceMeetPlayedGames(
        meetId: number,
        games: Array<{ gameId: number; participantIds: Array<number> }>,
        expectedStatus: 'scheduled' | 'active',
    ): Promise<{
        applied: boolean
        playedGameIds: Array<number>
        skippedGameIds: Array<number>
        playedGameParticipants: Array<{ gameId: number; participantIds: Array<number> }>
    }> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const statusGuard = await transaction.execute({
                sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
                args: [meetId, expectedStatus],
            })

            if (statusGuard.rowsAffected !== 1) {
                await transaction.commit()
                return { applied: false, playedGameIds: [], skippedGameIds: [], playedGameParticipants: [] }
            }

            const gameIds = games.map(game => game.gameId)
            const placeholders = gameIds.map(() => '?').join(', ')
            const keepPlayedCondition = gameIds.length > 0 ? `AND gameId NOT IN (${placeholders})` : ''

            await transaction.execute({
                sql: `
                    UPDATE MeetGame
                    SET gameStatus = 'skipped'
                    WHERE meetId = ? AND gameStatus IN ('planned', 'played') ${keepPlayedCondition}
                `,
                args: [meetId, ...gameIds],
            })

            if (gameIds.length > 0) {
                await transaction.execute({
                    sql: `UPDATE MeetGame SET gameStatus = 'played' WHERE meetId = ? AND gameId IN (${placeholders})`,
                    args: [meetId, ...gameIds],
                })
                await transaction.batch(
                    gameIds.map(gameId => ({
                        sql: "INSERT OR IGNORE INTO MeetGame (meetId, gameId, gameStatus) VALUES (?, ?, 'played')",
                        args: [meetId, gameId],
                    })),
                )
            }

            await transaction.execute({
                sql: 'DELETE FROM MeetAccountGame WHERE meetId = ?',
                args: [meetId],
            })

            const participantStatements: Array<InStatement> = []

            for (const game of games) {
                for (const accountId of game.participantIds) {
                    participantStatements.push({
                        sql: 'INSERT OR IGNORE INTO MeetAccountGame (meetId, accountId, gameId) VALUES (?, ?, ?)',
                        args: [meetId, accountId, game.gameId],
                    })
                }
            }
            if (participantStatements.length > 0) {
                await transaction.batch(participantStatements)
            }

            const result = await transaction.execute({
                sql: "SELECT gameId, gameStatus FROM MeetGame WHERE meetId = ? AND gameStatus IN ('played', 'skipped')",
                args: [meetId],
            })
            const participantResult = await transaction.execute({
                sql: 'SELECT gameId, accountId FROM MeetAccountGame WHERE meetId = ? ORDER BY gameId ASC, accountId ASC',
                args: [meetId],
            })

            await transaction.commit()

            const participantMap = new Map<number, Array<number>>()

            for (const row of participantResult.rows) {
                const gameId = Number(row[0])
                const participantIds = participantMap.get(gameId) ?? []

                participantIds.push(Number(row[1]))
                participantMap.set(gameId, participantIds)
            }

            return {
                applied: true,
                playedGameIds: result.rows.filter(row => String(row[1]) === 'played').map(row => Number(row[0])),
                skippedGameIds: result.rows.filter(row => String(row[1]) === 'skipped').map(row => Number(row[0])),
                playedGameParticipants: [...participantMap.entries()].map(([gameId, participantIds]) => ({ gameId, participantIds })),
            }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async getPlayedGameIdsByMeetId(meetId: number): Promise<Array<number>> {
        const resultSet = await this._tursoExecute({
            sql: "SELECT gameId FROM MeetGame WHERE meetId = ? AND gameStatus = 'played' ORDER BY playOrder ASC, gameId ASC",
            args: [meetId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getMeetPlayedGameParticipants(meetId: number): Promise<Array<{ gameId: number; participantIds: Array<number> }>> {
        const resultSet = await this._tursoExecute({
            sql: `
                SELECT gameId, accountId
                FROM MeetAccountGame
                WHERE meetId = ?
                ORDER BY gameId ASC, accountId ASC
            `,
            args: [meetId],
        })

        const participantMap = new Map<number, Array<number>>()

        for (const row of resultSet.rows) {
            const gameId = Number(row[0])
            const participantIds = participantMap.get(gameId) ?? []

            participantIds.push(Number(row[1]))
            participantMap.set(gameId, participantIds)
        }

        return [...participantMap.entries()].map(([gameId, participantIds]) => ({ gameId, participantIds }))
    }

    getMeetMember(meetId: number, accountId: number) {
        return this._tursoExecute({
            sql: `
                SELECT 1
                FROM Meet m
                LEFT JOIN GroupMembership gm ON gm.groupId = m.groupId AND gm.accountId = ?
                WHERE m.id = ? AND (gm.accountId IS NOT NULL OR m.createdBy = ?)
            `,
            args: [accountId, meetId, accountId],
        })
    }

    getMeetsByGroupId(groupId: number) {
        return this._tursoExecute({
            sql: `
                SELECT id, groupId, createdBy, meetDate, isConfirmed,
                    status, timezone, notes
                FROM Meet
                WHERE groupId = ?
            `,
            args: [groupId],
        })
    }

    getMeetDetailsByIdForAccount(meetId: number, accountId: number) {
        return this._tursoExecute({
            sql: `
            SELECT 
                m.id,
                m.groupId,
                m.createdBy,
                m.meetDate,
                m.isConfirmed,
                (
                    SELECT json_group_array(ma.accountId)
                    FROM MeetAttendee ma
                    WHERE ma.meetId = m.id
                ) AS attendees,
                (
                    SELECT json_group_array(json_object(
                        'accountId', ma.accountId,
                        'rsvpStatus', ma.rsvpStatus,
                        'attendanceStatus', ma.attendanceStatus
                    ))
                    FROM MeetAttendee ma
                    WHERE ma.meetId = m.id
                ) AS attendeeStatuses,
                (
                    SELECT json_group_array(mg.gameId)
                    FROM MeetGame mg
                    WHERE mg.meetId = m.id AND mg.gameStatus = 'played'
                ) AS playedGames,
                (
                    SELECT json_group_array(mg.gameId)
                    FROM MeetGame mg
                    WHERE mg.meetId = m.id AND mg.gameStatus = 'planned'
                ) AS plannedGames,
                (
                    SELECT json_group_array(mg.gameId)
                    FROM MeetGame mg
                    WHERE mg.meetId = m.id AND mg.gameStatus = 'skipped'
                ) AS skippedGames,
                (
                    SELECT COALESCE(json_group_array(json_object(
                        'gameId', mg.gameId,
                        'participantIds', json(COALESCE((
                            SELECT json_group_array(mag.accountId)
                            FROM MeetAccountGame mag
                            WHERE mag.meetId = m.id AND mag.gameId = mg.gameId
                        ), '[]'))
                    )), '[]')
                    FROM MeetGame mg
                    WHERE mg.meetId = m.id AND mg.gameStatus = 'played'
                ) AS playedGameParticipants,
                m.status,
                m.timezone,
                m.notes
            FROM Meet m
            INNER JOIN GroupMembership gm ON gm.groupId = m.groupId
            WHERE m.id = ? AND gm.accountId = ?
            `,
            args: [meetId, accountId],
        })
    }

    getMeetAttendeeForAccount(meetId: number, accountId: number) {
        return this._tursoExecute({
            sql: `
                SELECT ma.meetId, ma.accountId, ma.rsvpStatus, ma.attendanceStatus, ma.respondedAt, m.status
                FROM MeetAttendee ma
                INNER JOIN Meet m ON m.id = ma.meetId
                WHERE ma.meetId = ? AND ma.accountId = ?
            `,
            args: [meetId, accountId],
        })
    }

    updateMeetAttendeeRsvp(meetId: number, accountId: number, rsvpStatus: 'accepted' | 'declined') {
        return this._tursoExecute({
            sql: `
                UPDATE MeetAttendee
                SET rsvpStatus = ?, respondedAt = CURRENT_TIMESTAMP
                WHERE meetId = ? AND accountId = ?
            `,
            args: [rsvpStatus, meetId, accountId],
        })
    }

    async getMeetAttendeeIds(meetId: number): Promise<Array<number>> {
        const resultSet = await this._tursoExecute({
            sql: 'SELECT accountId FROM MeetAttendee WHERE meetId = ?',
            args: [meetId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getMeetAttendedAccountIds(meetId: number): Promise<Array<number>> {
        const resultSet = await this._tursoExecute({
            sql: "SELECT accountId FROM MeetAttendee WHERE meetId = ? AND attendanceStatus = 'attended'",
            args: [meetId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getDistinctCompletedMeetIdsForAccountHistory(accountId: number): Promise<Array<number>> {
        const resultSet = await this._tursoExecute({
            sql: `
                SELECT DISTINCT m.id
                FROM Meet m
                WHERE m.status = 'completed'
                  AND (
                      EXISTS (
                          SELECT 1
                          FROM MeetAttendee ma
                          WHERE ma.meetId = m.id AND ma.accountId = ? AND ma.attendanceStatus = 'attended'
                      )
                      OR (
                          EXISTS (
                              SELECT 1
                              FROM MeetAccountGame mag
                              WHERE mag.meetId = m.id AND mag.accountId = ?
                          )
                          AND NOT EXISTS (
                              SELECT 1
                              FROM MeetAttendee ma
                              WHERE ma.meetId = m.id AND ma.accountId = ?
                          )
                      )
                  )
                ORDER BY m.meetDate DESC, m.id DESC
            `,
            args: [accountId, accountId, accountId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async updateMeetAttendance(meetId: number, attendedIds: Array<number>): Promise<void> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const attendanceCondition = attendedIds.length === 0 ? '0' : `accountId IN (${attendedIds.map(() => '?').join(', ')})`

            await transaction.execute({
                sql: `
                    UPDATE MeetAttendee
                    SET attendanceStatus = CASE
                        WHEN ${attendanceCondition} THEN 'attended'
                        ELSE 'absent'
                    END
                    WHERE meetId = ?
                `,
                args: [...attendedIds, meetId],
            })
            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async createCompletedSession(input: CompletedSessionInput) {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const meetResult = await transaction.execute({
                sql: `
                INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone, notes, updatedAt)
                    VALUES (?, ?, ?, TRUE, 'completed', ?, ?, CURRENT_TIMESTAMP)
                `,
                args: [input.groupId, input.createdBy, input.sessionDate, input.timezone, input.notes ?? null],
            })
            const meetId = Number(meetResult.lastInsertRowid)
            const statements: Array<InStatement> = []

            for (const accountId of input.attendeeIds) {
                statements.push({
                    sql: `
                        INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus)
                        VALUES (?, ?, 'accepted', 'attended')
                    `,
                    args: [meetId, accountId],
                })
            }

            for (const game of input.games) {
                statements.push({
                    sql: `
                        INSERT INTO MeetGame (meetId, gameId, gameStatus)
                        VALUES (?, ?, 'played')
                    `,
                    args: [meetId, game.gameId],
                })

                for (const accountId of game.participantIds) {
                    statements.push({
                        sql: `
                            INSERT OR IGNORE INTO MeetAccountGame (meetId, accountId, gameId)
                            VALUES (?, ?, ?)
                        `,
                        args: [meetId, accountId, game.gameId],
                    })
                }
            }

            await transaction.batch(statements)
            await transaction.commit()

            return { lastInsertRowid: meetId }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async createScheduledSession(input: ScheduledSessionInput) {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const meetResult = await transaction.execute({
                sql: `
                    INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone, notes, updatedAt)
                    VALUES (?, ?, ?, FALSE, 'scheduled', ?, ?, CURRENT_TIMESTAMP)
                `,
                args: [input.groupId, input.createdBy, input.sessionDate, input.timezone, input.notes ?? null],
            })
            const meetId = Number(meetResult.lastInsertRowid)
            const statements: Array<InStatement> = input.attendeeIds.map(accountId => ({
                sql: `
                    INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus)
                    VALUES (?, ?, 'pending', 'unknown')
                `,
                args: [meetId, accountId],
            }))

            for (const gameId of input.plannedGameIds) {
                statements.push({
                    sql: `
                        INSERT INTO MeetGame (meetId, gameId, gameStatus)
                        VALUES (?, ?, 'planned')
                    `,
                    args: [meetId, gameId],
                })
            }

            await transaction.batch(statements)
            await transaction.commit()

            return { lastInsertRowid: meetId }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    addGroupMembersToMeeting(meetId: number, groupId: number) {
        return this._tursoExecute({
            sql: `
            INSERT OR IGNORE INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus)
            SELECT ?, gm.accountId
                , 'pending', 'unknown'
            FROM GroupMembership gm
            WHERE gm.groupId = ?;
            `,
            args: [meetId, groupId],
        })
    }

    createMeetAttendee(meetId: number, accountId: number) {
        return this._tursoExecute({
            sql: "INSERT OR IGNORE INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES (?, ?, 'pending', 'unknown')",
            args: [meetId, accountId],
        })
    }

    deleteMeetAttendee(meetId: number, accountId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM MeetAttendee WHERE meetId = ? AND accountId = ?',
            args: [meetId, accountId],
        })
    }

    async replaceMeetAttendees(meetId: number, accountIds: Array<number>, expectedStatus: 'scheduled' | 'active'): Promise<boolean> {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const statusGuard = await transaction.execute({
                sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
                args: [meetId, expectedStatus],
            })

            if (statusGuard.rowsAffected !== 1) {
                await transaction.commit()
                return false
            }

            const placeholders = accountIds.map(() => '?').join(', ')

            await transaction.execute({
                sql: `DELETE FROM MeetAttendee WHERE meetId = ? AND accountId NOT IN (${placeholders})`,
                args: [meetId, ...accountIds],
            })
            await transaction.batch(
                accountIds.map(accountId => ({
                    sql: `
                    INSERT OR IGNORE INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus)
                    VALUES (?, ?, 'pending', 'unknown')
                    `,
                    args: [meetId, accountId],
                })),
            )
            await transaction.commit()
            return true
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    addGroupGamesToMeeting(meetId: number, groupId: number) {
        return this._tursoExecute({
            sql: `
            INSERT OR IGNORE INTO MeetGame (meetId, gameId)
            SELECT ?, og.gameId
            FROM OwnedGame og
            INNER JOIN GroupMembership gm ON og.accountId = gm.accountId
            WHERE gm.groupId = ?
            `,
            args: [meetId, groupId],
        })
    }

    // #region MeetAccountGame

    queryMeetAccountGame(options: MeetAccountGameQueryOptions) {
        // Build SELECT clause
        let selectClause = '*'

        if (options.select && options.select.length > 0) {
            selectClause = options.select.join(', ')
        }

        if (options.distinct) {
            selectClause = `DISTINCT ${selectClause}`
        }

        // Build WHERE clause
        const whereConditions: string[] = []
        const args: number[] = []

        if (options.where) {
            if (options.where.meetId !== undefined) {
                whereConditions.push('meetId = ?')
                args.push(options.where.meetId)
            }

            if (options.where.accountId !== undefined) {
                whereConditions.push('accountId = ?')
                args.push(options.where.accountId)
            }

            if (options.where.gameId !== undefined) {
                whereConditions.push('gameId = ?')
                args.push(options.where.gameId)
            }
        }

        const whereClause = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : ''
        const sql = `SELECT ${selectClause} FROM MeetAccountGame${whereClause}`

        return this._tursoExecute({ sql, args })
    }

    async createMeetAccountGame(accountId: number, meetId: number, gameId: number) {
        const transaction = await this.tursoClient.transaction('write')

        try {
            await transaction.execute({
                sql: `
                    INSERT OR IGNORE INTO MeetGame (meetId, gameId, gameStatus)
                    VALUES (?, ?, 'played')
                `,
                args: [meetId, gameId],
            })
            await transaction.execute({
                sql: `
                    UPDATE MeetGame
                    SET gameStatus = 'played'
                    WHERE meetId = ? AND gameId = ?
                `,
                args: [meetId, gameId],
            })
            const result = await transaction.execute({
                sql: 'INSERT OR IGNORE INTO MeetAccountGame (accountId, meetId, gameId) VALUES (?, ?, ?)',
                args: [accountId, meetId, gameId],
            })

            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async deleteMeetAccountGame(accountId: number, meetId: number, gameId: number) {
        const transaction = await this.tursoClient.transaction('write')

        try {
            const result = await transaction.execute({
                sql: 'DELETE FROM MeetAccountGame WHERE accountId = ? AND meetId = ? AND gameId = ?',
                args: [accountId, meetId, gameId],
            })

            await transaction.execute({
                sql: `
                    DELETE FROM MeetGame
                    WHERE meetId = ? AND gameId = ?
                      AND NOT EXISTS (
                          SELECT 1 FROM MeetAccountGame
                          WHERE meetId = ? AND gameId = ?
                      )
                `,
                args: [meetId, gameId, meetId, gameId],
            })
            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    // #region Tag

    getTags() {
        return this._tursoExecute('SELECT * FROM Tag')
    }

    getTagById(tagId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Tag WHERE id = ?',
            args: [tagId],
        })
    }

    getTagsByCategoryId(categoryId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Tag WHERE categoryId = ?',
            args: [categoryId],
        })
    }

    createTag(name: string, categoryId: number) {
        return this._tursoExecute({
            sql: 'INSERT INTO Tag (name, categoryId) VALUES (?, ?)',
            args: [name, categoryId],
        })
    }

    updateTag(id: number, name: string, categoryId: number) {
        return this._tursoExecute({
            sql: 'UPDATE Tag SET name = ?, categoryId = ? WHERE id = ?',
            args: [name, categoryId, id],
        })
    }

    deleteTag(id: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM Tag WHERE id = ?',
            args: [id],
        })
    }

    // #region TagCategory

    getTagCategories() {
        return this._tursoExecute('SELECT * FROM TagCategory')
    }

    getTagCategoryById(id: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM TagCategory WHERE id = ?',
            args: [id],
        })
    }

    createTagCategory(name: string) {
        return this._tursoExecute({
            sql: 'INSERT INTO TagCategory (name) VALUES (?)',
            args: [name],
        })
    }

    updateTagCategory(id: number, name: string) {
        return this._tursoExecute({
            sql: 'UPDATE TagCategory SET name = ? WHERE id = ?',
            args: [name, id],
        })
    }

    deleteTagCategory(id: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM TagCategory WHERE id = ?',
            args: [id],
        })
    }

    // #region GameTag

    getGameTags(gameId: number) {
        return this._tursoExecute({
            sql: `
            SELECT
                gt.gameId,
                gt.tagId
            FROM
                GameTag gt
            WHERE
                gt.gameId = ?;
            `,
            args: [gameId],
        })
    }

    getGameCountByTagCategoryId(tagCategoryId: number) {
        return this._tursoExecute({
            sql: `SELECT COUNT(*) FROM GameTag WHERE tagId IN (SELECT id FROM Tag WHERE categoryId = ?)`,
            args: [tagCategoryId],
        })
    }

    getGameCountByTagId(tagId: number) {
        return this._tursoExecute({
            sql: `SELECT COUNT(*) FROM GameTag WHERE tagId = ?`,
            args: [tagId],
        })
    }

    addGameTag(gameId: number, tagId: number) {
        return this._tursoExecute({
            sql: 'INSERT INTO GameTag (gameId, tagId) VALUES (?, ?)',
            args: [gameId, tagId],
        })
    }

    removeGameTag(gameId: number, tagId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM GameTag WHERE gameId = ? AND tagId = ?',
            args: [gameId, tagId],
        })
    }

    // #region Wishlist

    getWishlistByAccountId(accountId: number) {
        return this._tursoExecute({
            sql: `SELECT * FROM WishlistedGame w WHERE w.accountId = ?`,
            args: [accountId],
        })
    }

    getWishlistById(accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    addGameToWishlist(accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'INSERT INTO WishlistedGame (accountId, gameId) VALUES (?, ?)',
            args: [accountId, gameId],
        })
    }

    removeGameFromWishlist(accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM WishlistedGame WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    // #region GameProposal

    getGameProposals() {
        return this._tursoExecute('SELECT * FROM GameProposal ORDER BY submittedAt DESC')
    }

    getGameProposalById(id: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM GameProposal WHERE id = ?',
            args: [id],
        })
    }

    getGameProposalsByStatus(status: 'pending' | 'approved' | 'rejected' | 'duplicate') {
        return this._tursoExecute({
            sql: 'SELECT * FROM GameProposal WHERE status = ? ORDER BY submittedAt DESC',
            args: [status],
        })
    }

    getGameProposalsBySubmitter(submittedBy: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM GameProposal WHERE submittedBy = ? ORDER BY submittedAt DESC',
            args: [submittedBy],
        })
    }

    async createGameProposal(proposalData: {
        submittedBy: number
        title: string
        imageUrl?: string
        gameAvgDuration?: number
        minPlayers?: number
        maxPlayers?: number
        proposedTags?: string
        notes?: string
    }) {
        const { submittedBy, title, imageUrl, gameAvgDuration, minPlayers, maxPlayers, proposedTags, notes } = proposalData

        await this._tursoExecute({
            sql: `
                INSERT INTO GameProposal (
                    submittedBy, title, imageUrl, gameAvgDuration, 
                    minPlayers, maxPlayers, proposedTags, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                submittedBy,
                title,
                imageUrl || null,
                gameAvgDuration || null,
                minPlayers || null,
                maxPlayers || null,
                proposedTags || null,
                notes || null,
            ],
        })
    }

    async updateGameProposal(
        id: number,
        updateData: {
            status?: 'pending' | 'approved' | 'rejected' | 'duplicate'
            reviewedBy?: number
            reviewNotes?: string
            createdGameId?: number
        },
    ) {
        const { status, reviewedBy, reviewNotes, createdGameId } = updateData

        const fields = []
        const args = []

        if (status !== undefined) {
            fields.push('status = ?')
            args.push(status)
        }

        if (reviewedBy !== undefined) {
            fields.push('reviewedBy = ?')
            args.push(reviewedBy)
        }

        if (reviewNotes !== undefined) {
            fields.push('reviewNotes = ?')
            args.push(reviewNotes)
        }

        if (createdGameId !== undefined) {
            fields.push('createdGameId = ?')
            args.push(createdGameId)
        }

        // If any review fields are being set, also set reviewedAt
        if (reviewedBy !== undefined || reviewNotes !== undefined || status !== undefined) {
            fields.push('reviewedAt = CURRENT_TIMESTAMP')
        }

        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        args.push(id)

        const sql = `
            UPDATE GameProposal
            SET ${fields.join(', ')}
            WHERE id = ?
        `

        await this._tursoExecute({ sql, args })

        return this.getGameProposalById(id)
    }

    deleteGameProposalById(id: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM GameProposal WHERE id = ?',
            args: [id],
        })
    }
}
