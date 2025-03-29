import { Client, createClient, type InStatement } from '@libsql/client'
import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'

import { SupportedLanguage } from 'src/common/types/game-translation.type'

import type { CollectionActivityDto } from '../../../common/types/collection-activity.type'
import type { GameOwnedDto, UpdateGameOwnedDto } from '../../../common/types/game-owned.type'
import type { CreateGroupMembershipBody } from '../../../common/types/group-membership.type'
import type { CreateGroupBody, UpdateGroupBody } from '../../../common/types/group.type'
import type { CreateInvitationBody, CreateInvitationByUsernameBody } from '../../../common/types/invitation.type'
import type { CreateNotificationBody, UpdateNotificationBody } from '../../../common/types/notification.type'
import type { CreateUserBody, UpdateUserBody } from '../../../common/types/user.type'
import type { MeetAccountGameQueryOptions } from '../../../modules/core/meet-account-games/meet-account-games.types'

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

    /**
     * Helper function to format the SQL string by replacing '?' with the actual arguments
     */
    private _formatSqlWithArgs(sql: string, args: any[] = []): string {
        let i = 0

        return sql.replace(/\?/g, () => {
            const value = args[i++]

            if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''")}'`
            }
            return String(value)
        })
    }

    /**
     * Use this instead of directly calling `tursoClient.execute` to log the SQL query before executing it
     */
    private _tursoExecute(stmt: InStatement) {
        let sql: string = ''

        if (typeof stmt === 'string') {
            sql = stmt
        } else {
            sql = this._formatSqlWithArgs(stmt.sql, stmt.args as any[])
        }

        // Log the formatted SQL
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

    getUserByPasswordResetToken(token: string) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE password_reset_token = ?',
            args: [token],
        })
    }

    async createUser(userDto: CreateUserBody, verificationToken: string) {
        const { email, password, username, displayName, avatar } = userDto
        const hashedPassword = await bcrypt.hash(password, 10)

        await this._tursoExecute({
            sql: 'INSERT INTO Account (email, password, username, displayName, avatar, verification_token) VALUES (?, ?, ?, ?, ?, ?)',
            args: [email, hashedPassword, username, displayName, JSON.stringify(avatar), verificationToken],
        })
    }

    async updateUser(id: number, partialUserDto: UpdateUserBody) {
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
        // Remove games
        for (const gameId of gamesToRemove) {
            await this._tursoExecute({
                sql: 'DELETE FROM OwnedGame WHERE accountId = ? AND gameId = ?',
                args: [accountId, gameId],
            })
        }

        // Add games
        for (const gameId of gamesToAdd) {
            await this._tursoExecute({
                sql: 'INSERT INTO OwnedGame (accountId, gameId) VALUES (?, ?)',
                args: [accountId, gameId],
            })
        }
    }

    async findUserByVerificationToken(token: string) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE verification_token = ?',
            args: [token],
        })
    }

    // #region Group

    getGroups() {
        return this._tursoExecute('SELECT * FROM UserGroup')
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
                i.id, i.groupId, i.fromAccountId, i.toAccountId, i.sentAt,
                -- Selecting all properties for the fromAccount
                json_object(
                    'id', fa.id,
                    'email', fa.email,
                    'username', fa.username,
                    'displayName', fa.displayName,
                    'avatar', fa.avatar,
                    'createdAt', fa.created_at,
                    'isDeleted', fa.isDeleted
                ) as fromAccount,
                -- Selecting all properties for the toAccount
                json_object(
                    'id', ta.id,
                    'email', ta.email,
                    'username', ta.username,
                    'displayName', ta.displayName,
                    'avatar', ta.avatar,
                    'createdAt', ta.created_at,
                    'isDeleted', ta.isDeleted
                ) as toAccount
            FROM Invitation i
            JOIN Account fa ON i.fromAccountId = fa.id AND fa.isDeleted = 0
            JOIN Account ta ON i.toAccountId = ta.id AND ta.isDeleted = 0
            WHERE i.groupId = ?
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
            sql: 'SELECT * FROM Invitation WHERE toAccountId = ?',
            args: [accountId],
        })
    }

    async createInvitation(invitationDto: CreateInvitationBody) {
        await this._tursoExecute({
            sql: 'INSERT INTO Invitation (groupId, fromAccountId, toAccountId) VALUES (?, ?, ?)',
            args: [invitationDto.groupId, invitationDto.fromAccountId, invitationDto.toAccountId],
        })
    }

    async createInvitationByUsername(invitationDto: CreateInvitationByUsernameBody) {
        const toAccount = await this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE username = ?',
            args: [invitationDto.username],
        })

        if (toAccount.rows.length === 0) {
            throw new NotFoundException('User not found')
        }

        await this._tursoExecute({
            sql: 'INSERT INTO Invitation (groupId, fromAccountId, toAccountId) VALUES (?, ?, ?)',
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

    getNotificationById(id: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Notification WHERE id = ?',
            args: [id],
        })
    }

    getNotificationsByAccountId(accountId: number) {
        return this._tursoExecute({
            sql: `
                SELECT n.id, n.accountId, n.type, n.message, n.createdAt, n.isRead
                FROM Notification n
                WHERE n.accountId = ?
            `,
            args: [accountId],
        })
    }

    createNotification(notificationDto: CreateNotificationBody) {
        return this._tursoExecute({
            sql: 'INSERT INTO Notification (accountId, type, message) VALUES (?, ?, ?)',
            args: [notificationDto.accountId, notificationDto.type, notificationDto.message],
        })
    }

    updateNotification(id: number, partialNotificationDto: UpdateNotificationBody) {
        // Array to store fields to update
        const fields = []
        const args = []

        // Dynamically build the update query based on the provided properties
        if (partialNotificationDto.accountId) {
            fields.push('accountId = ?')
            args.push(partialNotificationDto.accountId)
        }

        if (partialNotificationDto.type) {
            fields.push('type = ?')
            args.push(partialNotificationDto.type)
        }

        if (partialNotificationDto.message) {
            fields.push('message = ?')
            args.push(partialNotificationDto.message)
        }

        if (partialNotificationDto.isRead) {
            fields.push('isRead = ?')
            args.push(partialNotificationDto.isRead)
        }

        // Error if no fields are provided
        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        // Add user id as the last argument
        args.push(id)

        // Construct the final query
        const sql = `
          UPDATE Notification
          SET ${fields.join(', ')}
          WHERE id = ?
        `

        // Execute the query
        return this._tursoExecute({ sql, args })
    }

    deleteNotificationById(id: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM Notification WHERE id = ?',
            args: [id],
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

    getMeets() {
        return this._tursoExecute('SELECT * FROM Meet')
    }

    getMeetById(meetId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Meet WHERE id = ?',
            args: [meetId],
        })
    }

    getMeetsByGroupId(groupId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Meet WHERE groupId = ?',
            args: [groupId],
        })
    }

    getMeetDetailsById(meetId: number) {
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
                    SELECT json_group_array(mg.gameId)
                    FROM MeetGame mg
                    WHERE mg.meetId = m.id
                ) AS playedGames
            FROM Meet m
            WHERE m.id = ?
            `,
            args: [meetId],
        })
    }

    createMeeting(groupId: number, createdBy: number) {
        return this._tursoExecute({
            sql: 'INSERT INTO Meet (groupId, createdBy) VALUES (?, ?)',
            args: [groupId, createdBy],
        })
    }

    addGroupMembersToMeeting(meetId: number, groupId: number) {
        return this._tursoExecute({
            sql: `
            INSERT INTO MeetAttendee (meetId, accountId)
            SELECT ?, gm.accountId
            FROM GroupMembership gm
            WHERE gm.groupId = ?;
            `,
            args: [meetId, groupId],
        })
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

    createMeetAccountGame(accountId: number, meetId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'INSERT INTO MeetAccountGame (accountId, meetId, gameId) VALUES (?, ?, ?)',
            args: [accountId, meetId, gameId],
        })
    }

    deleteMeetAccountGame(accountId: number, meetId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM MeetAccountGame WHERE accountId = ? AND meetId = ? AND gameId = ?',
            args: [accountId, meetId, gameId],
        })
    }

    // #region GameTag

    getGameTags(gameId: number) {
        return this._tursoExecute({
            sql: `
            SELECT
                t.name AS tag,
                tc.name AS category
            FROM
                GameTag gt
                JOIN Tag t ON gt.tagId = t.id
                JOIN TagCategory tc ON t.categoryId = tc.id
            WHERE
                gt.gameId = ?;
            `,
            args: [gameId],
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
}
