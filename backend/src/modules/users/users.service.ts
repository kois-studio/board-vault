import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { CreateUserDto, UpdateUserDto, UserDto } from '../../common/types/shared/user.type'
import { ResultSet } from '@libsql/client/.'
import { usersSchema } from '../../common/schemas/user.schema'

@Injectable()
export class UsersService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<UserDto> {
        const users = resultSet.rows.map(row => ({
            id: Number(row[0]),
            email: String(row[1]),
            password: String(row[2]),
            createdAt: String(row[3]),
            alias: String(row[4]),
            imageUrl: String(row[5]),
        }))

        const result = usersSchema.safeParse(users)

        if (!result.success) {
            this.LOGGER.error('Failed to parse users from database')
            this.LOGGER.error(result.error)
            return []
        }
        return result.data
    }

    async getUsers(): Promise<Array<UserDto>> {
        this.LOGGER.log('Getting all users...')
        const resultSet = await this.databaseService.getUsers()

        return this._parseResultSet(resultSet)
    }

    async getUserById(id: number) {
        this.LOGGER.log(`Getting user with id ${id}...`)
        const resultSet = await this.databaseService.getUserById(id)
        const users = this._parseResultSet(resultSet)

        if (users.length === 0) {
            return new NotFoundException(`User with id ${id} not found`)
        }
        return users[0]
    }

    createUser(userDto: CreateUserDto) {
        this.LOGGER.log(`Creating user with ${userDto.email}`)
        return this.databaseService.createUser(userDto)
    }

    deleteUserById(id: number) {
        this.LOGGER.log(`Deleting user with id ${id}`)
        return this.databaseService.deleteUserById(id)
    }

    updateUser(id: number, partialUserDto: UpdateUserDto) {
        this.LOGGER.log(`Updating user with id ${id}`)
        return this.databaseService.updateUser(id, partialUserDto)
    }
}
