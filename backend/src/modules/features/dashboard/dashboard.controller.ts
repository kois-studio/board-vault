import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { DashboardService } from './dashboard.service'
import { GroupWithMembersAndGames } from '../../../common/types/group.type'
import { SuccessDto } from 'src/common/types/auth.type'
import { UserOwnershipGuard } from 'src/common/guards/ownership.guard'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('/users/:userId/groups')
    @ApiOperation({ summary: 'Get all groups of a user with members and games', deprecated: false })
    @ApiResponse({ status: 200, type: [GroupWithMembersAndGames], description: 'List of all groups of the user' })
    async getGroupsOfUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.dashboardService.getGroupsOfUser(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/users/:userId/groups/create/:groupName')
    @ApiOperation({ summary: 'Create a new group', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'Group created successfully' })
    async createGroup(@Param('userId', ParseIntPipe) userId: number, @Param('groupName') groupName: string) {
        return this.dashboardService.createGroup(userId, groupName)
    }
}
