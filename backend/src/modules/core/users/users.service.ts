import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { usersSchema } from '../../../common/schemas'
import { AvatarDto, UpdateUserBody, UserGetDto, UserPublicDto } from '../../../common/types/user.type'
import { DatabaseService } from '../../common/database/database.service'

@Injectable()
export class UsersService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    // Read Account columns by name: the table's column order is not a contract.
    private _parseResultSet(resultSet: ResultSet): Array<UserGetDto> {
        const users = resultSet.rows.map(row => ({
            id: Number(row.id),
            email: String(row.email),
            username: String(row.username),
            avatar: JSON.parse(String(row.avatar)) as AvatarDto,
            displayName: String(row.displayName),
            createdAt: String(row.created_at),
            isDeleted: Boolean(row.isDeleted),
            isAdmin: Number(row.isAdmin) === 1,
        }))

        const result = usersSchema.safeParse(users)

        if (!result.success) {
            this.LOGGER.error('Failed to parse users from database')
            return []
        }

        return result.data
    }

    async getUsers(): Promise<Array<UserGetDto>> {
        this.LOGGER.log('Getting all users')
        const resultSet = await this.databaseService.accounts.getUsers()
        const users = this._parseResultSet(resultSet)

        return users
    }

    async getUserById(id: number): Promise<UserGetDto> {
        this.LOGGER.log('Getting user by id')
        const resultSet = await this.databaseService.accounts.getUserById(id)
        const users = this._parseResultSet(resultSet)

        const [user] = users

        if (!user) {
            throw new NotFoundException(`User with id ${id} not found`)
        }
        return user
    }

    /** Public profiles for many accounts in one query, keyed by id. */
    async getPublicUsersByIds(ids: Array<number>): Promise<Map<number, UserPublicDto>> {
        const uniqueIds = [...new Set(ids)]

        if (uniqueIds.length === 0) {
            return new Map()
        }

        const users = this._parseResultSet(await this.databaseService.accounts.getUsersByIds(uniqueIds))

        return new Map(
            users.map(user => [user.id, { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar }]),
        )
    }

    async getPublicUserById(id: number): Promise<UserPublicDto> {
        const user = await this.getUserById(id)

        return {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
        }
    }

    async getUserByEmail(email: string): Promise<UserGetDto> {
        this.LOGGER.log('Getting user by email')
        const resultSet = await this.databaseService.accounts.getUserByEmail(email)
        const users = this._parseResultSet(resultSet)

        const [user] = users

        if (!user) {
            throw new NotFoundException(`User with email ${email} not found`)
        }

        return user
    }

    async getUserByUsername(username: string): Promise<UserGetDto> {
        this.LOGGER.log('Getting user by username')
        const resultSet = await this.databaseService.accounts.getUserByUsername(username)
        const users = this._parseResultSet(resultSet)

        const [user] = users

        if (!user) {
            throw new NotFoundException(`User with username ${username} not found`)
        }

        return user
    }

    async getUserByClerkId(clerkUserId: string): Promise<UserGetDto> {
        this.LOGGER.log('Getting user by Clerk identity')
        const resultSet = await this.databaseService.accounts.getUserByClerkId(clerkUserId)
        const users = this._parseResultSet(resultSet)

        const [user] = users

        if (!user) {
            throw new NotFoundException(`No user linked to Clerk identity ${clerkUserId}`)
        }

        return user
    }

    async createClerkUser(user: { email: string; username: string; displayName: string; avatar: object; clerkUserId: string }) {
        await this.databaseService.accounts.createClerkUser({
            ...user,
            avatar: JSON.stringify(user.avatar),
        })

        return { success: true }
    }

    async updateUser(id: number, partialUserDto: UpdateUserBody): Promise<{ success: boolean }> {
        this.LOGGER.log('Updating user')
        const resultSet = await this.databaseService.accounts.updateUserProfile(id, partialUserDto)

        if (resultSet.rows.length === 0) {
            throw new NotFoundException(`User with id ${id} not found`)
        }

        return { success: true }
    }

    async deleteUserById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Deleting user')
        const resultSet = await this.databaseService.accounts.softDeleteUserById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`User with id ${id} not found`)
        }

        return { success: true }
    }

    async updateGames(accountId: number, gamesToAdd: number[], gamesToRemove: number[]): Promise<{ success: boolean }> {
        this.LOGGER.log('Updating games for user')
        try {
            // TODO: responsability of games-owned.service, delete this query
            await this.databaseService.collection.updateGames(accountId, gamesToAdd, gamesToRemove)

            return { success: true }
        } catch {
            this.LOGGER.error('Failed to update games for user')
            throw new NotFoundException('Failed to update games for user')
        }
    }
}
