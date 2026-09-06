import { ResultSet } from '@libsql/client/.'
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { usersSchema } from '../../../common/schemas'
import { AvatarDto, CreateUserBody, UpdateUserBody, UserCompleteDto, UserGetDto, UserPublicDto } from '../../../common/types/user.type'
import { DatabaseService } from '../../common/database/database.service'

@Injectable()
export class UsersService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<UserCompleteDto> {
        const users = resultSet.rows.map(row => ({
            id: Number(row[0]),
            email: String(row[1]),
            username: String(row[2]),
            password: String(row[3]),
            avatar: JSON.parse(String(row[4])) as AvatarDto,
            displayName: String(row[5]),
            createdAt: String(row[6]),
            isDeleted: Boolean(row[7]),
            isAdmin: Number(row[8]) === 1 ? true : false,
            email_verified: Boolean(row[9]),
            verification_token: String(row[10]),
            password_reset_token: String(row[11]),
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
        const resultSet = await this.databaseService.getUsers()
        const users = this._parseResultSet(resultSet)

        return users.map(user => ({
            ...user,
            password: undefined,
        }))
    }

    async getUserById(id: number): Promise<UserGetDto> {
        this.LOGGER.log('Getting user by id')
        const resultSet = await this.databaseService.getUserById(id)
        const users = this._parseResultSet(resultSet)

        if (users.length === 0) {
            throw new NotFoundException(`User with id ${id} not found`)
        }
        users[0].password = undefined!
        users[0].verification_token = undefined!
        users[0].password_reset_token = undefined!

        return users[0]
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

    /**
     * password is needed for auth.service,
     * thats why `include_password` option available
     */
    async getUserByEmail(email: string, include_password = false): Promise<UserGetDto | UserCompleteDto> {
        this.LOGGER.log('Getting user by email')
        const resultSet = await this.databaseService.getUserByEmail(email)
        const users = this._parseResultSet(resultSet)

        if (users.length === 0) {
            throw new NotFoundException(`User with email ${email} not found`)
        }

        users[0].verification_token = undefined!
        users[0].password_reset_token = undefined!

        return {
            ...users[0],
            password: include_password ? users[0].password : undefined!,
        }
    }

    async getUserByUsername(username: string): Promise<UserGetDto> {
        this.LOGGER.log('Getting user by username')
        const resultSet = await this.databaseService.getUserByUsername(username)
        const users = this._parseResultSet(resultSet)

        if (users.length === 0) {
            throw new NotFoundException(`User with username ${username} not found`)
        }

        users[0].password = undefined!
        users[0].verification_token = undefined!
        users[0].password_reset_token = undefined!
        return users[0]
    }

    async getUserByClerkId(clerkUserId: string): Promise<UserGetDto> {
        this.LOGGER.log('Getting user by Clerk identity')
        const resultSet = await this.databaseService.getUserByClerkId(clerkUserId)
        const users = this._parseResultSet(resultSet)

        if (users.length === 0) {
            throw new NotFoundException(`No user linked to Clerk identity ${clerkUserId}`)
        }

        users[0].password = undefined!
        users[0].verification_token = undefined!
        users[0].password_reset_token = undefined!
        return users[0]
    }

    async linkClerkUser(accountId: number, clerkUserId: string): Promise<UserGetDto> {
        this.LOGGER.log('Linking local user to Clerk identity')
        const resultSet = await this.databaseService.linkUserToClerkId(accountId, clerkUserId)

        if (resultSet.rowsAffected !== 1) {
            throw new ConflictException('The local account is already linked to another Clerk identity')
        }

        return this.getUserById(accountId)
    }

    async createClerkUser(user: { email: string; username: string; displayName: string; avatar: object; clerkUserId: string }) {
        await this.databaseService.createClerkUser({
            ...user,
            avatar: JSON.stringify(user.avatar),
        })

        return { success: true }
    }

    async createUser(userDto: CreateUserBody, verificationToken: string, verificationTokenExpiresAt?: number) {
        this.LOGGER.log('Creating user')
        try {
            await this.databaseService.createUser(userDto, verificationToken, verificationTokenExpiresAt)

            return { success: true }
        } catch {
            this.LOGGER.error('Failed to create user')
            throw new ConflictException('Email or Username already in use')
        }
    }

    async updateUser(id: number, partialUserDto: UpdateUserBody): Promise<{ success: boolean }> {
        this.LOGGER.log('Updating user')
        const resultSet = await this.databaseService.updateUserProfile(id, partialUserDto)

        if (resultSet.rows.length === 0) {
            throw new NotFoundException(`User with id ${id} not found`)
        }

        return { success: true }
    }

    async deleteUserById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Deleting user')
        const resultSet = await this.databaseService.softDeleteUserById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`User with id ${id} not found`)
        }

        return { success: true }
    }

    async updateGames(accountId: number, gamesToAdd: number[], gamesToRemove: number[]): Promise<{ success: boolean }> {
        this.LOGGER.log('Updating games for user')
        try {
            // TODO: responsability of games-owned.service, delete this query
            await this.databaseService.updateGames(accountId, gamesToAdd, gamesToRemove)

            return { success: true }
        } catch {
            this.LOGGER.error('Failed to update games for user')
            throw new NotFoundException('Failed to update games for user')
        }
    }
}
