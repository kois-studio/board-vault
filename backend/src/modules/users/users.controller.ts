import { Controller, Get, Logger, Param } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UsersService } from './users.service'

@ApiTags('users')
@Controller('users')
export class UsersController {
    private readonly logger: Logger

    constructor(private readonly usersService: UsersService) {
        this.logger = new Logger(this.constructor.name)
    }

    /**
     * ## Reset all database registers
     * @returns Confirmation that the database was deleted
     */
    @Get('/')
    @ApiOperation({
        summary: 'Get all users',
        description: 'Get a list of all users in the database',
    })
    @ApiResponse({
        status: 200,
        type: Boolean,
    })
    async getUsers() {
        return this.usersService.getUsers()
    }

    /**
     * ## Reset all database registers
     * @returns Confirmation that the database was deleted
     */
    @Get('/:userId')
    @ApiOperation({
        summary: 'Get user by id',
        description: 'Get a user by its id',
    })
    @ApiResponse({
        status: 200,
        type: Boolean,
    })
    @ApiParam({
        name: 'userId',
        type: String,
    })
    async getUserById(@Param('userId') userId: string) {
        // TODO: use pipe to validate userId and confirm its a number
        return this.usersService.getUserById(Number(userId))
    }
}
