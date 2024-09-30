import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { CreateUserDto, UpdateUserDto } from 'src/common/types/shared/user.type'

@Injectable()
export class UsersService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    getUsers() {
        this.LOGGER.log('Getting all users...')
        return this.databaseService.getUsers()
    }

    getUserById(id: number) {
        this.LOGGER.log(`Getting user with id ${id}...`)
        return this.databaseService.getUserById(id)
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
