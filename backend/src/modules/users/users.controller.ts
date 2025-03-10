import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { CreateUserBody, UpdateUserBody, UserGetDto, UserUpdateGamesBody } from '../../common/types/user.type'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GameDto, GameViewDto } from '../../common/types/game.type'
import { InvitationWithExtraData } from '../../common/types/invitation.type'
import { SuccessDto } from '../../common/types/auth.type'
import { NotificationDto } from '../../common/types/notification.type'
import { UserOwnershipGuard } from '../../common/guards/ownership.guard'
import { MeetDto } from '../../common/types/meet.type'
import { AccountGameHistoryDto } from '../../common/types/meet-account-game.type'

@UseGuards(JwtAuthGuard)
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all users', deprecated: true })
    @ApiResponse({ status: 200, type: [UserGetDto], description: 'List of all users' })
    async getUsers() {
        return this.usersService.getUsers()
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new user', deprecated: true })
    @ApiResponse({ status: 201, description: 'The user has been succesfully created' })
    async createUser(@Body() userDto: CreateUserBody) {
        return this.usersService.createUser(userDto, 'do-not-use-this-token')
    }

    @Get('/:userId')
    @ApiOperation({ summary: 'Get user by id', deprecated: true })
    @ApiResponse({ status: 200, type: UserGetDto, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    getUserById(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserById(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Put('/:userId')
    @ApiOperation({ summary: 'Update a user by ID' })
    @ApiResponse({ status: 200, description: 'The user has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    updateUser(@Param('userId', ParseIntPipe) userId: number, @Body() partialUserDto: UpdateUserBody) {
        return this.usersService.updateUser(userId, partialUserDto)
    }

    @UseGuards(UserOwnershipGuard)
    @Delete('/:userId')
    @ApiOperation({ summary: 'Delete a user by Id', deprecated: true })
    @ApiResponse({ status: 200, description: 'The user has been succesfully deleted' })
    async deleteUserById(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.deleteUserById(userId)
    }

    @Get('/:userId/groups')
    @ApiOperation({ summary: 'Get groups with members' })
    @ApiResponse({ status: 200, type: [Number] })
    getUserGroups(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserGroups(userId)
    }

    @Get('/:userId/games')
    @ApiOperation({ summary: 'Get games owned by user' })
    @ApiResponse({ status: 200, type: [GameDto] })
    getUserGames(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserGames(userId)
    }

    @Get('/:userId/meets')
    @ApiOperation({ summary: 'Get meets by user' })
    @ApiResponse({ status: 200, type: [MeetDto] })
    getUserMeets(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserMeets(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Put('/:userId/games')
    @ApiOperation({ summary: 'Modify games owned by user' })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The games have been successfully updated.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    updateUserGames(@Param('userId', ParseIntPipe) userId: number, @Body() userUpdateGamesBody: UserUpdateGamesBody) {
        return this.usersService.updateGames(userId, userUpdateGamesBody.gamesToAdd, userUpdateGamesBody.gamesToRemove)
    }

    @Get('/:userId/notifications')
    @ApiOperation({ summary: 'Get notifications for user' })
    @ApiResponse({ status: 200, type: [NotificationDto] })
    @ApiResponse({ status: 404, description: 'User not found.' })
    getUserNotifications(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserNotifications(userId)
    }

    @Get('/:userId/invitationsReceived')
    @ApiOperation({ summary: 'Get invitations received by user' })
    @ApiResponse({ status: 200, type: [InvitationWithExtraData] })
    getUserInvitationsReceived(@Param('userId', ParseIntPipe) userId: number) {
        // TODO: in a future, trim unnecessary data from the response
        return this.usersService.getUserInvitationsReceived(userId)
    }

    @Get('/:userId/history')
    @ApiOperation({ summary: 'Get games history for user' })
    @ApiResponse({ status: 200, type: [AccountGameHistoryDto] })
    getUserGamesHistory(@Param('userId', ParseIntPipe) userId: number) {
        return this.usersService.getUserGamesHistory(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/:userId/group/:groupId/leave')
    @ApiOperation({ summary: 'Leave a group (you CANNOT be the owner)' })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'You have left the group.' })
    @ApiResponse({ status: 404, description: 'User or group not found.' })
    leaveGroup(@Param('userId', ParseIntPipe) userId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.usersService.leaveGroup(userId, groupId)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/:userId/group/:groupId/newMeeting')
    @ApiOperation({ summary: 'Create a new empty meeting for today' })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'Meeting created.' })
    @ApiResponse({ status: 404, description: 'User or group not found.' })
    createMeeting(@Param('userId', ParseIntPipe) userId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.usersService.createMeeting(userId, groupId)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/:userId/group/create/:groupName')
    @ApiOperation({ summary: 'Create and assign owner to group' })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'You create the group.' })
    createGroup(@Param('userId', ParseIntPipe) userId: number, @Param('groupName') groupName: string) {
        return this.usersService.createGroup(userId, groupName)
    }

    @UseGuards(UserOwnershipGuard)
    @Delete('/:userId/group/:groupId/delete')
    @ApiOperation({ summary: 'Delete a group and delete all memberships' })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'You have deleted the group.' })
    @ApiResponse({ status: 404, description: 'User or group not found.' })
    deleteGroup(@Param('userId', ParseIntPipe) userId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.usersService.deleteGroup(userId, groupId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/:userId/games/:gameId')
    @ApiOperation({ summary: 'Get game view for user' })
    @ApiResponse({ status: 200, type: GameViewDto })
    getUserGame(@Param('userId', ParseIntPipe) userId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.usersService.getUserGame(userId, gameId)
    }
}
