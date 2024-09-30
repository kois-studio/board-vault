import { Body, Controller, Delete, Get, Logger, Param, Post, Put } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiParam, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UsersService } from './users.service'

class CreateUserType {
    @ApiProperty()
    email: string

    @ApiProperty()
    password: string

    @ApiProperty()
    alias: string

    @ApiProperty()
    imageUrl: string
}

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

    /**
     * ## Create a user
     * @returns
     */
    @Post('/')
    @ApiOperation({
        summary: 'Create a new user',
        description: 'Create a new user with email, password, alias and imageUrl',
    })
    @ApiResponse({
        status: 201,
        description: 'The user has been succesfully created',
    })
    async createUser(@Body() createUserBody: CreateUserType) {
        const { email, password, alias, imageUrl } = createUserBody

        console.log(email, password, alias, imageUrl)
        return this.usersService.createUser(email, password, alias, imageUrl)
    }

    /**
     * ## Delete a user by id
     * @returns
     */
    @Delete('/:userId')
    @ApiOperation({
        summary: 'Delete a user by Id',
        description: 'Delete a user from the databased based on its id',
    })
    @ApiResponse({
        status: 200,
        description: 'The user has been succesfully deleted',
    })
    @ApiParam({
        name: 'userId',
        type: String,
        description: 'ID of the user to be deleted',
    })
    async deleteUserById(@Param('userId') userId: string) {
        // TODO: use pipe to validate userId and confirm its a number
        return this.usersService.deleteUserById(Number(userId))
    }

    /**
     * ## Modify a user
     * @returns
     */
    @Put(':id')
    @ApiOperation({ summary: 'Update a user by ID' })
    @ApiParam({ name: 'id', required: true, description: 'User ID' })
    @ApiBody({ type: CreateUserType, description: 'Partial or full user object to update' })
    @ApiResponse({ status: 200, description: 'The user has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    updateUser(@Param('id') id: string, @Body() userDto: Partial<CreateUserType>) {
        const { email, password, alias, imageUrl } = userDto

        return this.usersService.updateUser(Number(id), email, password, alias, imageUrl)
    }
}
