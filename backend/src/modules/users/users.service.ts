import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { CreateUserBody, UpdateUserBody, UserCompleteDto, UserGetDto } from '../../common/types/user.type'
import { ResultSet } from '@libsql/client/.'
import { usersSchema } from '../../common/schemas'
import { GameDto } from '../../common/types/game.type'
import { InvitationDto } from '../../common/types/invitation.type'

@Injectable()
export class UsersService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<UserCompleteDto> {
        const users = resultSet.rows.map(row => ({
            id: Number(row[0]),
            email: String(row[1]),
            password: String(row[2]),
            createdAt: String(row[3]),
            username: String(row[4]),
            imageUrl: String(row[5]),
            is_deleted: Boolean(row[6]),
            display_name: String(row[7]),
        }))

        const result = usersSchema.safeParse(users)

        if (!result.success) {
            this.LOGGER.error('Failed to parse users from database')
            this.LOGGER.error(result.error)
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

    async getUserById(id: number): Promise<UserGetDto | NotFoundException> {
        this.LOGGER.log(`Getting user with id ${id}`)
        const resultSet = await this.databaseService.getUserById(id)
        const users = this._parseResultSet(resultSet)

        if (users.length === 0) {
            return new NotFoundException(`User with id ${id} not found`)
        }
        users[0].password = undefined!

        return users[0]
    }

    /**
     * password is needed for auth.service,
     * thats why `include_password` option available
     */
    async getUserByEmail(email: string, include_password = false): Promise<UserGetDto | UserCompleteDto | NotFoundException> {
        this.LOGGER.log(`Getting user with email ${email}`)
        const resultSet = await this.databaseService.getUserByEmail(email)
        const users = this._parseResultSet(resultSet)

        if (users.length === 0) {
            return new NotFoundException(`User with email ${email} not found`)
        }

        return {
            ...users[0],
            password: include_password ? users[0].password : undefined!,
        }
    }

    async createUser(userDto: CreateUserBody) {
        this.LOGGER.log(`Creating user ${userDto.username} - ${userDto.email}`)
        try {
            await this.databaseService.createUser(userDto)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to create user', error)
            return new ConflictException('Email or Username already in use')
        }
    }

    async updateUser(id: number, partialUserDto: UpdateUserBody): Promise<{ success: boolean }> {
        this.LOGGER.log(`Updating user with id ${id}`)
        const resultSet = await this.databaseService.updateUser(id, partialUserDto)

        if (resultSet.rows.length === 0) {
            throw new NotFoundException(`User with id ${id} not found`)
        }

        return { success: true }
    }

    async deleteUserById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting user with id ${id}`)
        const resultSet = await this.databaseService.softDeleteUserById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`User with id ${id} not found`)
        }

        return { success: true }
    }

    async getUserGroups(userId: number) {
        this.LOGGER.log('Getting groups for user')
        const resultSet = await this.databaseService.getUserGroups(userId)

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getUserGames(userId: number): Promise<Array<GameDto>> {
        this.LOGGER.log(`Getting all games for user ${userId}`)
        const resultSet = await this.databaseService.getUserGames(userId)

        return resultSet.rows.map(row => ({
            id: Number(row[0]),
            title: String(row[1]),
            imageUrl: String(row[2]),
            gameAvgDuration: Number(row[3]),
            minPlayers: Number(row[4]),
            maxPlayers: Number(row[5]),
        }))
    }

    async getUserInvitationsReceived(userId: number): Promise<Array<InvitationDto>> {
        this.LOGGER.log('Getting invitations for user')
        const resultSet = await this.databaseService.getUserInvitationsReceived(userId)

        return resultSet.rows.map(row => ({
            id: Number(row[0]),
            groupId: Number(row[1]),
            fromAccountId: Number(row[2]),
            toAccountId: Number(row[3]),
            status: String(row[4]),
            sentAt: String(row[5]),
        }))
    }

    async getUserInvitationsSent(userId: number): Promise<Array<InvitationDto>> {
        this.LOGGER.log('Getting invitations sent by user')
        const resultSet = await this.databaseService.getUserInvitationsSent(userId)

        return resultSet.rows.map(row => ({
            id: Number(row[0]),
            groupId: Number(row[1]),
            fromAccountId: Number(row[2]),
            toAccountId: Number(row[3]),
            status: String(row[4]),
            sentAt: String(row[5]),
        }))
    }

    async updateGames(accountId: number, gamesToAdd: number[], gamesToRemove: number[]): Promise<{ success: boolean }> {
        this.LOGGER.log(`Updating games for user with id ${accountId}`)
        try {
            await this.databaseService.updateGames(accountId, gamesToAdd, gamesToRemove)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to update games for user', error)
            throw new NotFoundException('Failed to update games for user')
        }
    }
}
