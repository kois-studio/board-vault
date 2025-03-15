import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
import { SuccessDto } from '../../../common/types/auth.type'
import { CreateUserBody, UpdateUserBody, UserGetDto, UserUpdateGamesBody } from '../../../common/types/user.type'

import { UsersService } from './users.service'

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

    @UseGuards(UserOwnershipGuard)
    @Put('/:userId/games')
    @ApiOperation({ summary: 'Modify games owned by user' })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The games have been successfully updated.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    updateUserGames(@Param('userId', ParseIntPipe) userId: number, @Body() userUpdateGamesBody: UserUpdateGamesBody) {
        return this.usersService.updateGames(userId, userUpdateGamesBody.gamesToAdd, userUpdateGamesBody.gamesToRemove)
    }
}
