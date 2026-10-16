import { timingSafeEqual } from 'node:crypto'

import { Controller, Get, Headers, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'

import { structuredLog } from '../../../common/logging/structured-log.js'
import { DatabaseService } from '../../common/database/database.service.js'

import { UsageService } from './usage.service.js'

function sameSecret(given: string, expected: string): boolean {
    const a = Buffer.from(given)
    const b = Buffer.from(expected)

    return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * The daily job, called by Vercel Cron (`backend/vercel.json`) with `Authorization: Bearer
 * $CRON_SECRET`. Without `CRON_SECRET` the route does not exist. It rolls up usage events and
 * forgets the emails of expired group person claims.
 */
@ApiExcludeController()
@Controller('internal')
export class MaintenanceController {
    private readonly LOGGER = new Logger(MaintenanceController.name)

    constructor(
        private readonly usageService: UsageService,
        private readonly databaseService: DatabaseService,
    ) {}

    @Get('/daily-maintenance')
    async daily(@Headers('authorization') authorization: string | undefined) {
        const secret = process.env.CRON_SECRET?.trim()

        if (!secret) throw new NotFoundException()
        if (!sameSecret(authorization ?? '', `Bearer ${secret}`)) throw new UnauthorizedException()

        const usage = await this.usageService.runDailyMaintenance()
        const expiredClaims = (await this.databaseService.groups.clearExpiredClaimEmails()).rowsAffected

        this.LOGGER.log(structuredLog('group_person.expired_claims_cleared', { expiredClaims }))
        return { usage, expiredClaims }
    }
}
