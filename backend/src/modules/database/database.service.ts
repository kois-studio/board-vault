import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, createClient, type InStatement } from '@libsql/client'
import * as bcrypt from 'bcrypt'
import type { CreateUserBody, UpdateUserBody } from '../../common/types/user.type'
import type { CreateGroupBody, UpdateGroupBody } from '../../common/types/group.type'
import type { CreateGroupMembershipBody } from '../../common/types/group-membership.type'
import type { CreateGameBody, UpdateGameBody } from '../../common/types/game.type'
import type { CreateInvitationBody, CreateInvitationByUsernameBody } from '../../common/types/invitation.type'
import type { GameOwnedDto } from '../../common/types/game-owned.type'
import type { CreateNotificationBody, UpdateNotificationBody } from '../../common/types/notification.type'
import type { CreateGameReviewBody } from '../../common/types/game-review.type'

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

    getUserGroups(userId: number) {
        return this._tursoExecute({
            sql: `
                SELECT gm.groupId
                FROM GroupMembership gm
                WHERE gm.accountId = ?
            `,
            args: [userId],
        })
    }

    getUserGames(userId: number) {
        return this._tursoExecute({
            sql: `
                SELECT g.id, g.title, g.imageUrl, g.gameAvgDuration, g.minPlayers, g.maxPlayers
                FROM Game g
                JOIN OwnedGame og
                ON g.id = og.gameId
                WHERE og.accountId = ?
            `,
            args: [userId],
        })
    }

    getUserReviews(userId: number) {
        return this._tursoExecute({
            sql: `
                SELECT 
                    gr.accountId,
                    gr.gameId, 
                    gr.review, 
                    gr.reviewDate, 
                    json_object(
                        'id', g.id, 
                        'title', g.title, 
                        'imageUrl', g.imageUrl, 
                        'gameAvgDuration', g.gameAvgDuration, 
                        'minPlayers', g.minPlayers, 
                        'maxPlayers', g.maxPlayers
                    ) AS gameData
                FROM 
                    GameReview gr
                JOIN Game g ON gr.gameId = g.id
                WHERE gr.accountId = ?;
            `,
            args: [userId],
        })
    }

    getUserNotifications(userId: number) {
        return this._tursoExecute({
            sql: `
                SELECT n.id, n.accountId, n.type, n.message, n.createdAt, n.isRead
                FROM Notification n
                WHERE n.accountId = ?
            `,
            args: [userId],
        })
    }

    getGroupMeets(groupId: number) {
        return this._tursoExecute({
            sql: `
                SELECT m.id, m.groupId, m.createdBy, m.meetDate, m.isConfirmed
                FROM Meet m
                WHERE m.groupId = ?
            `,
            args: [groupId],
        })
    }

    getUserInvitationsReceived(userId: number) {
        return this._tursoExecute({
            sql: `
                SELECT i.id, i.groupId, i.fromAccountId, i.toAccountId, i.sentAt
                FROM Invitation i
                WHERE i.toAccountId = ?
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

    getUserGamesHistory(userId: number) {
        return this._tursoExecute({
            sql: `SELECT 
            mag.accountId,
            json_object(
                'id', g.id,
                'title', g.title,
                'imageUrl', g.imageUrl,
                'gameAvgDuration', g.gameAvgDuration,
                'minPlayers', g.minPlayers,
                'maxPlayers', g.maxPlayers
            ) AS gameData,
            json_object(
                'id', m.id,
                'groupId', m.groupId,
                'createdBy', m.createdBy,
                'meetDate', m.meetDate,
                'isConfirmed', m.isConfirmed
            ) AS meetData
            FROM MeetAccountGame mag
            JOIN Game g ON mag.gameId = g.id
            JOIN Meet m ON mag.meetId = m.id
            WHERE mag.accountId = ?
            ORDER BY m.meetDate DESC;
            `,
            args: [userId],
        })
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

    getGroupWithMembersAndGames(groupId: number) {
        return this._tursoExecute({
            sql: `SELECT 
                g.id,
                g.name,
                g.createdBy,
                g.createdAt,
                json_group_array(
                    json_object(
                        'id', a.id,
                        'username', a.username,
                        'displayName', a.displayName,
                        'email', a.email,
                        'avatar', a.avatar,
                        'joinedAt', gm.joinedAt,
                        'games', (
                            SELECT json_group_array(
                                json_object(
                                    'id', og.gameId,
                                    'title', ga.title,
                                    'imageUrl', ga.imageUrl,
                                    'gameAvgDuration', ga.gameAvgDuration,
                                    'minPlayers', ga.minPlayers,
                                    'maxPlayers', ga.maxPlayers
                                )
                            )
                            FROM OwnedGame og
                            JOIN Game ga ON og.gameId = ga.id
                            WHERE og.accountId = a.id
                        ),
                        'reviews', (
                            SELECT json_group_array(
                                json_object(
                                    'accountId', gr.accountId,
                                    'gameId', gr.gameId,
                                    'review', gr.review,
                                    'reviewDate', gr.reviewDate
                                )
                            )
                            FROM GameReview gr
                            WHERE gr.accountId = a.id
                        )
                    )
                ) AS members
            FROM UserGroup g
            JOIN GroupMembership gm ON gm.groupId = g.id
            JOIN Account a ON a.id = gm.accountId
            WHERE g.id = ?
            GROUP BY g.id
            ORDER BY g.id;
            `,
            args: [groupId],
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

    getGroupMeetings(groupId: number) {
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
            WHERE m.groupId = ?
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

    getGames() {
        return this._tursoExecute('SELECT * FROM Game')
    }

    getGameById(id: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Game WHERE id = ?',
            args: [id],
        })
    }

    async createGame(gameDto: CreateGameBody) {
        await this._tursoExecute({
            sql: 'INSERT INTO Game (title, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (?, ?, ?, ?, ?)',
            args: [gameDto.title, gameDto.imageUrl, gameDto.gameAvgDuration, gameDto.minPlayers, gameDto.maxPlayers],
        })
    }

    async updateGame(id: number, partialGameDto: UpdateGameBody) {
        // Array to store fields to update
        const fields = []
        const args = []

        // Dynamically build the update query based on the provided properties
        if (partialGameDto.title) {
            fields.push('title = ?')
            args.push(partialGameDto.title)
        }

        if (partialGameDto.imageUrl) {
            fields.push('imageUrl = ?')
            args.push(partialGameDto.imageUrl)
        }

        if (partialGameDto.gameAvgDuration) {
            fields.push('gameAvgDuration = ?')
            args.push(partialGameDto.gameAvgDuration)
        }

        if (partialGameDto.minPlayers) {
            fields.push('minPlayers = ?')
            args.push(partialGameDto.minPlayers)
        }

        if (partialGameDto.maxPlayers) {
            fields.push('maxPlayers = ?')
            args.push(partialGameDto.maxPlayers)
        }

        // Error if no fields are provided
        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        // Add user id as the last argument
        args.push(id)

        // Construct the final query
        const sql = `
          UPDATE Game
          SET ${fields.join(', ')}
          WHERE id = ?
        `

        // Execute the query
        await this._tursoExecute({ sql, args })

        // Return the updated user
        return this.getGameById(id)
    }

    deleteGameById(id: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM Game WHERE id = ?',
            args: [id],
        })
    }

    // #region OwnedGame

    getOwnedGames() {
        return this._tursoExecute('SELECT * FROM OwnedGame')
    }

    getOwnedGameById(accountId: number, gameId: number) {
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

    createGameReview(gameReviewDto: CreateGameReviewBody) {
        return this._tursoExecute({
            sql: 'INSERT INTO GameReview (accountId, gameId, review) VALUES (?, ?, ?)',
            args: [gameReviewDto.accountId, gameReviewDto.gameId, gameReviewDto.review],
        })
    }

    deleteGameReviewById(accountId: number, gameId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM GameReview WHERE accountId = ? AND gameId = ?',
            args: [accountId, gameId],
        })
    }

    // #region Meetings

    getMeets() {
        return this._tursoExecute('SELECT * FROM Meet')
    }

    getMeetAttendees() {
        return this._tursoExecute('SELECT * FROM MeetAttendee')
    }

    getMeetById(meetId: number) {
        return this._tursoExecute({
            sql: 'SELECT * FROM Meet WHERE id = ?',
            args: [meetId],
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

    updateMeetConfirmation(meetId: number) {
        return this._tursoExecute({
            sql: 'UPDATE Meet SET isConfirmed = true WHERE id = ?',
            args: [meetId],
        })
    }

    // #region MeetAttendee

    createMeetAttendee(meetId: number, accountId: number) {
        return this._tursoExecute({
            sql: 'INSERT INTO MeetAttendee (meetId, accountId) VALUES (?, ?)',
            args: [meetId, accountId],
        })
    }

    deleteMeetAttendee(meetId: number, accountId: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM MeetAttendee WHERE meetId = ? AND accountId = ?',
            args: [meetId, accountId],
        })
    }

    // #region MeetGame

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
                SELECT t.name
                FROM GameTag gt
                INNER JOIN Tag t ON gt.tagId = t.id
                WHERE gt.gameId = ?
            `,
            args: [gameId],
        })
    }
    
}
