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
}
