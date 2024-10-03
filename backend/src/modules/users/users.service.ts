import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { CreateUserBody, UpdateUserBody, UserCompleteDto, UserGetDto } from '../../common/types/shared/user.type'
import { ResultSet } from '@libsql/client/.'
import { usersSchema } from '../../common/schemas'

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

    // TODO: check responses here, probably need a try/catch as create
    deleteUserById(id: number): Promise<ResultSet> {
        this.LOGGER.log(`Deleting user with id ${id}`)
        return this.databaseService.softDeleteUserById(id)
    }

    updateUser(id: number, partialUserDto: UpdateUserBody): Promise<ResultSet> {
        this.LOGGER.log(`Updating user with id ${id}`)
        return this.databaseService.updateUser(id, partialUserDto)
    }
}
