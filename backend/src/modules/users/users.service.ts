import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

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

    createUser(email: string, password: string, alias: string, imageUrl: string) {
        this.LOGGER.log(`Creating user with ${email}`)
        return this.databaseService.createUser(email, password, alias, imageUrl)
    }

    deleteUserById(id: number) {
        this.LOGGER.log(`Deleting user with id ${id}`)
        return this.databaseService.deleteUserById(id)
    }

    updateUser(id: number, email: string, password: string, alias: string, imageUrl: string) {
        this.LOGGER.log(`Updating user with id ${id}`)
        return this.databaseService.updateUser(id, email, password, alias, imageUrl)
    }
}
