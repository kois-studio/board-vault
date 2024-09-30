import { BadRequestException, Body, Controller, Delete, Get, Logger, Param, ParseIntPipe, Post, Put } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { CreateUserDto, UpdateUserDto, UserDto } from 'src/common/types/shared/user.type'

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
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, type: [UserDto], description: 'List of all users' })
    async getUsers() {
        return this.usersService.getUsers()
    }

    /**
     * ## Reset all database registers
     * @returns Confirmation that the database was deleted
     */
    @Get('/:userId')
    @ApiOperation({ summary: 'Get user by id' })
    @ApiResponse({ status: 200, type: UserDto, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiParam({ name: 'userId', type: String })
    getUserById(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserById(userId)
    }

    /**
     * ## Create a user
     * @returns
     */
    @Post('/')
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, description: 'The user has been succesfully created' })
    async createUser(@Body() userDto: CreateUserDto) {
        return this.usersService.createUser(userDto)
    }

    /**
     * ## Modify a user
     * @returns
     */
    @Put(':userId')
    @ApiOperation({ summary: 'Update a user by ID' })
    @ApiParam({ name: 'userId', required: true, description: 'User ID' })
    @ApiBody({ type: UpdateUserDto, description: 'Partial or full user object to update' })
    @ApiResponse({ status: 200, description: 'The user has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    updateUser(@Param('userId', ParseIntPipe) id: number, @Body() partialUserDto: UpdateUserDto) {
        return this.usersService.updateUser(id, partialUserDto)
    }

    /**
     * ## Delete a user by id
     * @returns
     */
    @Delete('/:userId')
    @ApiOperation({ summary: 'Delete a user by Id' })
    @ApiResponse({ status: 200, description: 'The user has been succesfully deleted' })
    @ApiParam({ name: 'userId', type: String, description: 'ID of the user to be deleted' })
    async deleteUserById(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.deleteUserById(userId)
    }
}
