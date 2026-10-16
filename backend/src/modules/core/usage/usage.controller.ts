import { Body, Controller, Get, HttpCode, Post, Put, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AdminGuard } from '../../../common/guards/admin.guard.js'
import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { RateLimit, RateLimitGuard } from '../../../common/guards/rate-limit.guard.js'
import { NavigationBody, PrivacySettingsDto, UsageReportDto } from '../../../common/types/usage.type.js'

import { UsageService } from './usage.service.js'

/** Usage analytics (ADR-0021). Paths avoid words that ad blockers drop, such as "track" or "analytics". */
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('usage')
@ApiBearerAuth()
@Controller()
export class UsageController {
    constructor(private readonly usageService: UsageService) {}

    @Post('/navigation')
    @HttpCode(204)
    @UseGuards(RateLimitGuard)
    @RateLimit(120, 60)
    @ApiOperation({ summary: 'Count a page view: the page now shown and the one before, as route templates' })
    @ApiResponse({ status: 204, description: 'Counted, or ignored when the account turned usage statistics off.' })
    async navigation(@Req() request: { user: { userId: number } }, @Body() body: NavigationBody): Promise<void> {
        await this.usageService.record(request.user.userId, 'page_viewed', body.page, body.from ?? null)
    }

    @Get('/settings/privacy')
    @ApiOperation({ summary: "The caller's privacy settings" })
    @ApiResponse({ status: 200, type: PrivacySettingsDto })
    async getPrivacy(@Req() request: { user: { userId: number } }): Promise<PrivacySettingsDto> {
        return { usageAnalytics: await this.usageService.isEnabledFor(request.user.userId) }
    }

    @Put('/settings/privacy')
    @ApiOperation({ summary: "Change the caller's privacy settings; turning usage statistics off deletes the caller's recent events" })
    @ApiResponse({ status: 200, type: PrivacySettingsDto })
    async setPrivacy(@Req() request: { user: { userId: number } }, @Body() body: PrivacySettingsDto): Promise<PrivacySettingsDto> {
        await this.usageService.setEnabledFor(request.user.userId, body.usageAnalytics)
        return { usageAnalytics: body.usageAnalytics }
    }

    @Get('/admin/usage')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: 'Usage of the last 30 days, funnels and earlier monthly totals (admins only)' })
    @ApiResponse({ status: 200, type: UsageReportDto })
    getReport(): Promise<UsageReportDto> {
        return this.usageService.getReport()
    }
}
