import { timingSafeEqual } from 'node:crypto'

import { Controller, Get, Headers, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'

import { UsageService } from './usage.service.js'

function sameSecret(given: string, expected: string): boolean {
    const a = Buffer.from(given)
    const b = Buffer.from(expected)

    return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * The daily job, called by Vercel Cron (`backend/vercel.json`) with `Authorization: Bearer
 * $CRON_SECRET`. Without `CRON_SECRET` the route does not exist.
 */
@ApiExcludeController()
@Controller('internal')
export class MaintenanceController {
    constructor(private readonly usageService: UsageService) {}

    @Get('/daily-maintenance')
    async daily(@Headers('authorization') authorization: string | undefined) {
        const secret = process.env.CRON_SECRET?.trim()

        if (!secret) throw new NotFoundException()
        if (!sameSecret(authorization ?? '', `Bearer ${secret}`)) throw new UnauthorizedException()

        return { usage: await this.usageService.runDailyMaintenance() }
    }
}
