import { createHmac } from 'node:crypto'

import { Injectable, Logger } from '@nestjs/common'

import { safeErrorName, structuredLog } from '../../../common/logging/structured-log.js'
import { DatabaseService } from '../../common/database/database.service.js'

import { buildUsageReport } from './usage-report.js'

import type { PrivacySettingsStateDto, UsageEventName, UsageReportDto } from '../../../common/types/usage.type.js'

/**
 * Usage analytics of our own (ADR-0021). Events carry a pseudonym, an HMAC of the account id with
 * `USAGE_PSEUDONYM_SECRET`; without the secret nothing is recorded. Recording never fails the
 * request that caused it.
 */
@Injectable()
export class UsageService {
    private readonly LOGGER = new Logger(UsageService.name)

    constructor(private readonly databaseService: DatabaseService) {}

    isRecording(): boolean {
        return Boolean(this.secret())
    }

    /** The account's pseudonym, or null when there is no secret. */
    pseudonym(accountId: number): string | null {
        const secret = this.secret()

        return secret ? createHmac('sha256', secret).update(`account:${accountId}`).digest('hex').slice(0, 32) : null
    }

    async record(accountId: number, name: UsageEventName, view: string | null = null, fromView: string | null = null): Promise<void> {
        const pseudonym = this.pseudonym(accountId)

        if (!pseudonym) return
        try {
            await this.databaseService.usage.record(accountId, { name, pseudonym, view, fromView })
        } catch (error) {
            this.LOGGER.warn(structuredLog('usage.record_failed', { event: name, error: safeErrorName(error) }))
        }
    }

    /** Whether usage statistics are on for the account, and whether it has answered the notice (#158). */
    async getChoice(accountId: number): Promise<PrivacySettingsStateDto> {
        const { optedOut, noticeAnswered } = await this.databaseService.usage.getChoice(accountId)

        return { usageAnalytics: !optedOut, noticeAnswered }
    }

    /** Turning it off also deletes the account's raw events, whether or not there is a secret now. */
    async setEnabledFor(accountId: number, enabled: boolean): Promise<void> {
        await this.databaseService.usage.setOptedOut(accountId, this.pseudonym(accountId) ?? '', !enabled)
    }

    /** Account deletion (ADR-0018): its raw events and its opt-out go. */
    async forgetAccount(accountId: number): Promise<void> {
        await this.databaseService.usage.forgetAccount(accountId, this.pseudonym(accountId) ?? '')
    }

    async runDailyMaintenance(): Promise<{ countedRows: number; deletedEvents: number }> {
        const result = await this.databaseService.usage.rollUpAndExpire()

        this.LOGGER.log(structuredLog('usage.daily_maintenance', result))
        return result
    }

    async getReport(): Promise<UsageReportDto> {
        const usage = this.databaseService.usage
        const [events, months, optedOut] = await Promise.all([usage.getRecentEvents(), usage.getMonths(), usage.countOptedOut()])

        return {
            recording: this.isRecording(),
            optedOut,
            ...buildUsageReport(
                events.rows.map(row => ({
                    name: String(row[0]),
                    pseudonym: String(row[1]),
                    view: row[2] === null ? null : String(row[2]),
                    fromView: row[3] === null ? null : String(row[3]),
                    createdAt: String(row[4]),
                })),
            ),
            months: months.rows.map(row => ({ month: String(row[0]), events: Number(row[1]), pageViews: Number(row[2]) })),
        }
    }

    private secret(): string {
        return process.env.USAGE_PSEUDONYM_SECRET?.trim() ?? ''
    }
}
