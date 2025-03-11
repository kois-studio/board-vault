import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { DashboardService } from './dashboard.service'
import { GroupWithMembersAndGames } from '../../../common/types/group.type'

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
}
