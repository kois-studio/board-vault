import { Body, Controller, Get, Put, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { HomePreferencesDto } from '../../../common/types/home.type.js'
import { DatabaseService } from '../../common/database/database.service.js'

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller('profile/home')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiTags('profile')
export class HomeController {
    constructor(private readonly database: DatabaseService) {}

    @Get()
    @ApiResponse({ status: 200, type: HomePreferencesDto })
    async get(@Req() request: { user: { userId: number } }): Promise<HomePreferencesDto> {
        return this.visible(request.user.userId, await this.database.home.get(request.user.userId))
    }

    @Put()
    @ApiResponse({ status: 200, type: HomePreferencesDto })
    async save(@Req() request: { user: { userId: number } }, @Body() body: HomePreferencesDto): Promise<HomePreferencesDto> {
        const preferences = await this.visible(request.user.userId, body)

        await this.database.home.save(request.user.userId, preferences)
        return preferences
    }

    private async visible(accountId: number, preferences: HomePreferencesDto): Promise<HomePreferencesDto> {
        const groups = await this.database.groups.getGroupsForAccount(accountId)
        const ids = new Set(groups.rows.map(row => Number(row[0])))

        return { ...preferences, pinnedGroupIds: preferences.pinnedGroupIds.filter(id => ids.has(id)) }
    }
}
