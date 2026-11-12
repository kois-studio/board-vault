import { timingSafeEqual } from 'node:crypto'

import { Controller, Get, Headers, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'

import { structuredLog } from '../../../common/logging/structured-log.js'
import { DatabaseService } from '../../common/database/database.service.js'
import { ProblemsService } from '../problems/problems.service.js'

import { UsageService } from './usage.service.js'

function sameSecret(given: string, expected: string): boolean {
    const a = Buffer.from(given)
    const b = Buffer.from(expected)

    return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * The daily job, called by Vercel Cron (`backend/vercel.json`) with `Authorization: Bearer
 * $CRON_SECRET`. Without `CRON_SECRET` the route does not exist. It rolls up usage events and
 * deletes Idempotency-Key records older than 24 hours (#246), takeover snapshots past their
 * 30-day undo window (ADR-0027) and problem reports older than 30 days (ADR-0028).
 */
@ApiExcludeController()
@Controller('internal')
export class MaintenanceController {
    private readonly LOGGER = new Logger(MaintenanceController.name)

    constructor(
        private readonly usageService: UsageService,
        private readonly databaseService: DatabaseService,
        private readonly problemsService: ProblemsService,
    ) {}

    @Get('/daily-maintenance')
    async daily(@Headers('authorization') authorization: string | undefined) {
        const secret = process.env.CRON_SECRET?.trim()

        if (!secret) throw new NotFoundException()
        if (!sameSecret(authorization ?? '', `Bearer ${secret}`)) throw new UnauthorizedException()

        const usage = await this.usageService.runDailyMaintenance()
        const expiredIdempotencyKeys = (await this.databaseService.idempotency.deleteExpired()).rowsAffected

        const expiredTakeovers = (await this.databaseService.takeovers.deleteExpired()).rowsAffected
        const expiredProblems = await this.problemsService.deleteExpired()

        this.LOGGER.log(structuredLog('idempotency.expired_keys_deleted', { expiredIdempotencyKeys }))
        this.LOGGER.log(structuredLog('takeover.expired_snapshots_deleted', { expiredTakeovers }))
        this.LOGGER.log(structuredLog('problem.expired_reports_deleted', { expiredProblems }))
        return { usage, expiredIdempotencyKeys, expiredTakeovers, expiredProblems }
    }
}
