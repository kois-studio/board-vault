import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AdminGuard } from '../../../common/guards/admin.guard.js'
import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { RateLimit, RateLimitGuard } from '../../../common/guards/rate-limit.guard.js'
import { ProblemReportBody, ProblemReportDto } from '../../../common/types/problem.type.js'

import { ProblemsService } from './problems.service.js'

/**
 * Problem reports of our own (#247, ADR-0028). `POST /problems` takes no sign-in: things break before sign-in finishes,
 * on public pages, and when sign-in itself fails. It is limited per address, and the table per day.
 */
@ApiTags('problems')
@Controller()
export class ProblemsController {
    constructor(private readonly problemsService: ProblemsService) {}

    @Post('/problems')
    @HttpCode(204)
    @UseGuards(RateLimitGuard)
    @RateLimit(30, 600)
    @ApiOperation({ summary: 'Report a problem the app ran into; scrubbed, with no account or IP address (ADR-0028)' })
    @ApiResponse({ status: 204, description: 'Recorded, or left out past the daily limit of distinct problems.' })
    @ApiResponse({ status: 429, description: 'Too many reports from this address.' })
    async report(@Body() body: ProblemReportBody, @Headers('user-agent') userAgent: string | undefined): Promise<void> {
        await this.problemsService.recordFromApp(body, userAgent)
    }

    @Get('/admin/problems')
    @UseGuards(AuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Problems of the last 30 days, most recent first (admins only)' })
    @ApiResponse({ status: 200, type: ProblemReportDto })
    getReport(): Promise<ProblemReportDto> {
        return this.problemsService.getReport()
    }
}
