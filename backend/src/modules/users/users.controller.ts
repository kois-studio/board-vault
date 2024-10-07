import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { CreateUserBody, UpdateUserBody, UserGetDto } from '../../common/types/user.type'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GameDto } from '../../common/types/game.type'
import { InvitationDto } from '../../common/types/invitation.type'

@UseGuards(JwtAuthGuard)
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, type: [UserGetDto], description: 'List of all users' })
    async getUsers() {
        return this.usersService.getUsers()
    }

    @Get('/:userId')
    @ApiOperation({ summary: 'Get user by id' })
    @ApiResponse({ status: 200, type: UserGetDto, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiParam({ name: 'userId', type: String })
    getUserById(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserById(userId)
    }

    @Get('/byEmail/:email')
    @ApiOperation({ summary: 'Get user by email' })
    @ApiResponse({ status: 200, type: UserGetDto, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiParam({ name: 'email', type: String })
    getUserByEmail(@Param('email') email: string) {
        return this.usersService.getUserByEmail(email)
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, description: 'The user has been succesfully created' })
    async createUser(@Body() userDto: CreateUserBody) {
        return this.usersService.createUser(userDto)
    }

    @Put(':userId')
    @ApiOperation({ summary: 'Update a user by ID' })
    @ApiParam({ name: 'userId', required: true, description: 'User ID' })
    @ApiBody({ type: UpdateUserBody, description: 'Partial or full user object to update' })
    @ApiResponse({ status: 200, description: 'The user has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    updateUser(@Param('userId', ParseIntPipe) userId: number, @Body() partialUserDto: UpdateUserBody) {
        return this.usersService.updateUser(userId, partialUserDto)
    }

    @Delete('/:userId')
    @ApiOperation({ summary: 'Delete a user by Id' })
    @ApiResponse({ status: 200, description: 'The user has been succesfully deleted' })
    @ApiParam({ name: 'userId', type: String, description: 'ID of the user to be deleted' })
    async deleteUserById(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.deleteUserById(userId)
    }

    @Get('/:userId/groups')
    @ApiOperation({ summary: 'Get groups with members' })
    @ApiResponse({ status: 200, type: [Number] })
    @ApiParam({ name: 'userId', type: String })
    getUserGroups(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserGroups(userId)
    }

    @Get('/:userId/games')
    @ApiOperation({ summary: 'Get games owned by user' })
    @ApiResponse({ status: 200, type: [GameDto] })
    @ApiParam({ name: 'userId', type: String })
    getUserGames(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserGames(userId)
    }

    @Get('/:userId/invitationsReceived')
    @ApiOperation({ summary: 'Get invitations received by user' })
    @ApiResponse({ status: 200, type: [InvitationDto] })
    @ApiParam({ name: 'userId', type: String })
    getUserInvitationsReceived(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserInvitationsReceived(userId)
    }

    @Get('/:userId/invitationsSent')
    @ApiOperation({ summary: 'Get invitations sent by user' })
    @ApiResponse({ status: 200, type: [InvitationDto] })
    @ApiParam({ name: 'userId', type: String })
    getUserInvitationsSent(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserInvitationsSent(userId)
    }
}
