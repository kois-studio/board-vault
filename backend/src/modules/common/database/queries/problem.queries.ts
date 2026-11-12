import type { ProblemKind, ProblemSource } from '../../../../common/types/problem.type.js'
import type { DatabaseService } from '../database.service.js'

/** Problem reports older than this are deleted by the daily job (ADR-0028). */
export const PROBLEM_REPORT_DAYS = 30
/** Distinct problems one day can add; past it, only problems already seen that day are counted (ADR-0028). */
export const PROBLEMS_PER_DAY = 300

export type ProblemRow = {
    fingerprint: string
    source: ProblemSource
    kind: ProblemKind
    name: string
    message: string
    stack: string | null
    view: string | null
    endpoint: string | null
    status: number | null
    requestId: string | null
    release: string | null
    locale: string | null
    browser: string | null
}

/** Problem reports (#247, ADR-0028): one row per distinct problem per day, with how often and the latest sample. */
export class ProblemQueries {
    constructor(private readonly database: DatabaseService) {}

    /**
     * Counts one more of a problem today: a new row, or one more on today's row with the latest sample. A new problem is
     * left out once today already has `PROBLEMS_PER_DAY` of them, so a flood of made-up reports can't grow the table.
     */
    record(problem: ProblemRow) {
        return this.database.execute({
            sql: `
                INSERT INTO ProblemReport (day, fingerprint, source, kind, name, message, stack, view, endpoint, status, requestId, release, locale, browser)
                SELECT date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                WHERE (SELECT COUNT(*) FROM ProblemReport WHERE day = date('now')) < ?
                   OR EXISTS (SELECT 1 FROM ProblemReport WHERE day = date('now') AND fingerprint = ?)
                ON CONFLICT (day, fingerprint) DO UPDATE SET
                    occurrences = occurrences + 1,
                    lastSeenAt = CURRENT_TIMESTAMP,
                    message = excluded.message,
                    stack = COALESCE(excluded.stack, stack),
                    requestId = COALESCE(excluded.requestId, requestId),
                    release = COALESCE(excluded.release, release),
                    locale = COALESCE(excluded.locale, locale),
                    browser = COALESCE(excluded.browser, browser)
            `,
            args: [
                problem.fingerprint,
                problem.source,
                problem.kind,
                problem.name,
                problem.message,
                problem.stack,
                problem.view,
                problem.endpoint,
                problem.status,
                problem.requestId,
                problem.release,
                problem.locale,
                problem.browser,
                PROBLEMS_PER_DAY,
                problem.fingerprint,
            ],
        })
    }

    /** The days of the last 30 with their rows, most recent first, for the admin report. */
    getRecent() {
        return this.database.execute({
            sql: `
                SELECT day, fingerprint, source, kind, name, message, stack, view, endpoint, status, requestId, release, locale,
                       browser, occurrences, firstSeenAt, lastSeenAt
                FROM ProblemReport
                WHERE day >= date('now', '-${PROBLEM_REPORT_DAYS} days')
                ORDER BY lastSeenAt DESC, id DESC
            `,
            args: [],
        })
    }

    /** The daily job: problems older than 30 days go. */
    deleteExpired() {
        return this.database.execute({
            sql: `DELETE FROM ProblemReport WHERE day < date('now', '-${PROBLEM_REPORT_DAYS} days')`,
            args: [],
        })
    }
}
