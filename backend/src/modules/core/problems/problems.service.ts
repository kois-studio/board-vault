import { Injectable, Logger } from '@nestjs/common'

import { safeErrorName, structuredLog } from '../../../common/logging/structured-log.js'
import { DatabaseService } from '../../common/database/database.service.js'
import { PROBLEMS_PER_DAY, type ProblemRow } from '../../common/database/queries/problem.queries.js'

import { browserFamily, endpointTemplate, PROBLEM_LIMITS, problemFingerprint, scrubProblemText } from './problem-scrub.js'

import type { ProblemReportBody, ProblemReportDto, ProblemSummaryDto } from '../../../common/types/problem.type.js'

/** The build this API runs: the commit Vercel built, else `local`. */
export function apiRelease(): string {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'
}

/**
 * Problem reports of our own (#247, ADR-0028): what broke in the app or the API, scrubbed, with no account, pseudonym
 * or IP address. Recording never fails the request that caused it, and never throws.
 */
@Injectable()
export class ProblemsService {
    private readonly LOGGER = new Logger(ProblemsService.name)

    constructor(private readonly databaseService: DatabaseService) {}

    /** A problem the app sent (`POST /problems`), with the browser told only as a family and system. */
    async recordFromApp(body: ProblemReportBody, userAgent: string | undefined): Promise<void> {
        const endpoint = body.kind === 'request' && body.method && body.path ? endpointTemplate(body.method, body.path) : null

        await this.record({
            source: 'app',
            kind: body.kind,
            name: body.name,
            message: body.message,
            stack: body.stack ?? null,
            view: body.view ?? null,
            endpoint,
            status: body.kind === 'request' ? (body.status ?? null) : null,
            requestId: body.requestId ?? null,
            release: body.release ?? null,
            locale: body.locale ?? null,
            browser: browserFamily(userAgent),
        })
    }

    /** An exception the API did not expect (the error filter's 500s), so it outlives the hour Vercel keeps logs. */
    async recordFromApi(error: unknown, request: { method: string; route?: { path?: string }; requestId?: string }): Promise<void> {
        const path = request.route?.path

        await this.record({
            source: 'api',
            kind: 'exception',
            name: error instanceof Error ? error.name : typeof error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? (error.stack ?? null) : null,
            view: null,
            // The route as declared (`/users/:userId/groups`), never the address with its ids.
            endpoint: path ? endpointTemplate(request.method, path) : null,
            status: 500,
            requestId: request.requestId ?? null,
            release: apiRelease(),
            locale: null,
            browser: null,
        })
    }

    async getReport(): Promise<ProblemReportDto> {
        const result = await this.databaseService.problems.getRecent()
        const byFingerprint = new Map<string, ProblemSummaryDto>()
        const rowsPerDay = new Map<string, number>()

        // Rows come most recent first, so the first row of a problem holds its latest sample.
        for (const row of result.rows) {
            const day = String(row[0])
            const fingerprint = String(row[1])
            const occurrences = Number(row[14])
            const firstSeenAt = String(row[15])
            const known = byFingerprint.get(fingerprint)

            rowsPerDay.set(day, (rowsPerDay.get(day) ?? 0) + 1)
            if (known) {
                known.occurrences += occurrences
                known.days += 1
                if (firstSeenAt < known.firstSeenAt) known.firstSeenAt = firstSeenAt
                continue
            }
            const text = (index: number) => (row[index] === null || row[index] === undefined ? null : String(row[index]))

            byFingerprint.set(fingerprint, {
                fingerprint,
                source: String(row[2]) as ProblemSummaryDto['source'],
                kind: String(row[3]) as ProblemSummaryDto['kind'],
                name: String(row[4]),
                message: String(row[5]),
                stack: text(6),
                view: text(7),
                endpoint: text(8),
                status: row[9] === null ? null : Number(row[9]),
                requestId: text(10),
                release: text(11),
                locale: text(12),
                browser: text(13),
                occurrences,
                days: 1,
                firstSeenAt,
                lastSeenAt: String(row[16]),
            })
        }

        return {
            problems: [...byFingerprint.values()],
            dailyLimit: PROBLEMS_PER_DAY,
            limitReached: [...rowsPerDay.values()].some(count => count >= PROBLEMS_PER_DAY),
        }
    }

    async deleteExpired(): Promise<number> {
        return (await this.databaseService.problems.deleteExpired()).rowsAffected
    }

    private async record(problem: Omit<ProblemRow, 'fingerprint'>): Promise<void> {
        const scrubbed = {
            ...problem,
            name: scrubProblemText(problem.name, PROBLEM_LIMITS.name) || 'Error',
            message: scrubProblemText(problem.message, PROBLEM_LIMITS.message),
            stack: problem.stack ? scrubProblemText(problem.stack, PROBLEM_LIMITS.stack) : null,
        }

        try {
            await this.databaseService.problems.record({ ...scrubbed, fingerprint: problemFingerprint(scrubbed) })
        } catch (error) {
            this.LOGGER.warn(
                structuredLog('problem.record_failed', { source: problem.source, kind: problem.kind, error: safeErrorName(error) }),
            )
        }
    }
}
