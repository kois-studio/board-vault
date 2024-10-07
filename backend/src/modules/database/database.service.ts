import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, createClient, type InStatement } from '@libsql/client'
import { CreateUserBody, UpdateUserBody } from '../../common/types/user.type'
import * as bcrypt from 'bcrypt'
import { CreateGroupBody, UpdateGroupBody } from '../../common/types/group.type'
import { CreateGroupMembershipBody } from '../../common/types/group-membership.type'
import { CreateGameBody, UpdateGameBody } from '../../common/types/game.type'
import { CreateInvitationBody, CreateInvitationByUsernameBody } from '../../common/types/invitation.type'
import { GameOwnedDto } from '../../common/types/game-owned.type'

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

    async createUser(userDto: CreateUserBody) {
        const { email, password, username, display_name, imageUrl } = userDto
        const hashedPassword = await bcrypt.hash(password, 10)

        await this._tursoExecute({
            sql: 'INSERT INTO Account (email, password, username, display_name, imageUrl) VALUES (?, ?, ?, ?, ?)',
            args: [email, hashedPassword, username, display_name, imageUrl],
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
        if (partialUserDto.display_name) {
            fields.push('display_name = ?')
            args.push(partialUserDto.display_name)
        }
        if (partialUserDto.imageUrl) {
            fields.push('imageUrl = ?')
            args.push(partialUserDto.imageUrl)
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
            sql: 'UPDATE Account SET is_deleted = true WHERE id = ?',
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

    getUserInvitationsReceived(userId: number) {
        return this._tursoExecute({
            sql: `
                SELECT i.id, i.groupId, i.fromAccountId, i.toAccountId, i.status, i.sentAt
                FROM Invitation i
                WHERE i.toAccountId = ?
            `,
            args: [userId],
        })
    }

    getUserInvitationsSent(userId: number) {
        return this._tursoExecute({
            sql: `
                SELECT i.id, i.groupId, i.fromAccountId, i.toAccountId, i.status, i.sentAt
                FROM Invitation i
                WHERE i.fromAccountId = ?
            `,
            args: [userId],
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

    softDeleteGroupById(id: number) {
        return this._tursoExecute({
            sql: 'UPDATE UserGroup SET is_deleted = true WHERE id = ?',
            args: [id],
        })
    }

    // avoid deleting groups -> soft delete instead
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
                        'accountId', a.id,
                        'username', a.username,
                        'display_name', a.display_name,
                        'email', a.email,
                        'imageUrl', a.imageUrl,
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
                i.id, i.groupId, i.fromAccountId, i.toAccountId, i.status, i.sentAt,
                -- Selecting all properties for the fromAccount
                json_object(
                    'id', fa.id,
                    'email', fa.email,
                    'username', fa.username,
                    'display_name', fa.display_name,
                    'imageUrl', fa.imageUrl,
                    'createdAt', fa.created_at,
                    'is_deleted', fa.is_deleted
                ) as fromAccount,
                -- Selecting all properties for the toAccount
                json_object(
                    'id', ta.id,
                    'email', ta.email,
                    'username', ta.username,
                    'display_name', ta.display_name,
                    'imageUrl', ta.imageUrl,
                    'createdAt', ta.created_at,
                    'is_deleted', ta.is_deleted
                ) as toAccount
            FROM Invitation i
            JOIN Account fa ON i.fromAccountId = fa.id AND fa.is_deleted = 0
            JOIN Account ta ON i.toAccountId = ta.id AND ta.is_deleted = 0
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
            sql: 'INSERT INTO Invitation (groupId, fromAccountId, toAccountId, status) VALUES (?, ?, ?, ?)',
            args: [invitationDto.groupId, invitationDto.fromAccountId, invitationDto.toAccountId, invitationDto.status],
        })
    }

    async createInvitationByUsername(invitationDto: CreateInvitationByUsernameBody) {
        const toAccount = await this._tursoExecute({
            sql: 'SELECT * FROM Account WHERE username = ?',
            args: [invitationDto.username],
        })

        if (toAccount.rows.length === 0) {
            throw new BadRequestException('User not found')
        }

        await this._tursoExecute({
            sql: 'INSERT INTO Invitation (groupId, fromAccountId, toAccountId, status) VALUES (?, ?, ?, ?)',
            args: [invitationDto.groupId, invitationDto.fromAccountId, toAccount.rows[0].id, 'pending'],
        })
    }

    deleteInvitationById(id: number) {
        return this._tursoExecute({
            sql: 'DELETE FROM Invitation WHERE id = ?',
            args: [id],
        })
    }
}
