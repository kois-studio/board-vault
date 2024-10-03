import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GroupWithMembers } from 'src/common/types/shared/group-with-members.type'

@UseGuards(JwtAuthGuard)
@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('groupWithMembers/:userId')
    @ApiOperation({ summary: 'Get groups with members' })
    @ApiResponse({ status: 200, type: [GroupWithMembers] })
    @ApiParam({ name: 'userId', type: String })
    dashboardGetGroupsWithMembers(@Param('userId', ParseIntPipe) userId: number) {
        return this.dashboardService.dashboardGetGroupsWithMembers(userId)
    }
}
