import type { DatabaseService } from '../database.service.js'

/** Raw events older than this are deleted by the daily job (ADR-0021). */
export const RAW_EVENT_DAYS = 30

/** Usage analytics (ADR-0021): pseudonymous events for 30 days, anonymous daily counts after. */
export class UsageQueries {
    constructor(private readonly database: DatabaseService) {}

    /** Records one event, unless the account turned usage statistics off. */
    record(accountId: number, event: { name: string; pseudonym: string; view: string | null; fromView: string | null }) {
        return this.database.execute({
            sql: `
                INSERT INTO UsageEvent (name, pseudonym, view, fromView)
                SELECT ?, ?, ?, ?
                WHERE NOT EXISTS (SELECT 1 FROM UsageOptOut WHERE accountId = ?)
            `,
            args: [event.name, event.pseudonym, event.view, event.fromView, accountId],
        })
    }

    /** Whether the account turned usage statistics off, and whether it has answered the notice (#158). */
    async getChoice(accountId: number): Promise<{ optedOut: boolean; noticeAnswered: boolean }> {
        const result = await this.database.execute({
            sql: `
                SELECT EXISTS (SELECT 1 FROM UsageOptOut WHERE accountId = ?),
                       EXISTS (SELECT 1 FROM UsageNotice WHERE accountId = ?)
            `,
            args: [accountId, accountId],
        })
        const [row] = result.rows

        return { optedOut: Number(row?.[0]) === 1, noticeAnswered: Number(row?.[1]) === 1 }
    }

    /**
     * Off: recorded in UsageOptOut, and the account's raw events go. On: the opt-out goes. Either
     * way the account has now answered the notice, so it isn't shown again.
     */
    setOptedOut(accountId: number, pseudonym: string, optedOut: boolean) {
        return this.database.batch([
            ...(optedOut
                ? [
                      { sql: 'INSERT OR IGNORE INTO UsageOptOut (accountId) VALUES (?)', args: [accountId] },
                      { sql: 'DELETE FROM UsageEvent WHERE pseudonym = ?', args: [pseudonym] },
                  ]
                : [{ sql: 'DELETE FROM UsageOptOut WHERE accountId = ?', args: [accountId] }]),
            { sql: 'INSERT OR IGNORE INTO UsageNotice (accountId) VALUES (?)', args: [accountId] },
        ])
    }

    /** Account deletion: the account's raw events, its opt-out and its answer go. Anonymous counts stay. */
    forgetAccount(accountId: number, pseudonym: string) {
        return this.database.batch([
            { sql: 'DELETE FROM UsageEvent WHERE pseudonym = ?', args: [pseudonym] },
            { sql: 'DELETE FROM UsageOptOut WHERE accountId = ?', args: [accountId] },
            { sql: 'DELETE FROM UsageNotice WHERE accountId = ?', args: [accountId] },
        ])
    }

    /**
     * The daily job: every finished day still in the raw events becomes anonymous counts (a day
     * already counted is left alone), then raw events older than 30 days are deleted.
     */
    async rollUpAndExpire(): Promise<{ countedRows: number; deletedEvents: number }> {
        const [counted, deleted] = await this.database.batch([
            {
                sql: `
                    INSERT OR IGNORE INTO UsageDaily (day, name, view, events, people)
                    SELECT date(createdAt), name, COALESCE(view, ''), COUNT(*), COUNT(DISTINCT pseudonym)
                    FROM UsageEvent
                    WHERE date(createdAt) < date('now')
                      AND date(createdAt) NOT IN (SELECT DISTINCT day FROM UsageDaily)
                    GROUP BY date(createdAt), name, COALESCE(view, '')
                `,
                args: [],
            },
            { sql: `DELETE FROM UsageEvent WHERE createdAt < datetime('now', '-${RAW_EVENT_DAYS} days')`, args: [] },
        ])

        return { countedRows: counted?.rowsAffected ?? 0, deletedEvents: deleted?.rowsAffected ?? 0 }
    }

    /** Raw events of the last 30 days, oldest first, for the report and its funnels. */
    getRecentEvents() {
        return this.database.execute({
            sql: `
                SELECT name, pseudonym, view, fromView, createdAt
                FROM UsageEvent
                WHERE createdAt >= datetime('now', '-${RAW_EVENT_DAYS} days')
                ORDER BY createdAt ASC, id ASC
            `,
            args: [],
        })
    }

    /** Monthly totals from the anonymous counts, newest first. */
    getMonths() {
        return this.database.execute({
            sql: `
                SELECT substr(day, 1, 7) AS month, SUM(events) AS events,
                       SUM(CASE WHEN name = 'page_viewed' THEN events ELSE 0 END) AS pageViews
                FROM UsageDaily
                GROUP BY month
                ORDER BY month DESC
                LIMIT 24
            `,
            args: [],
        })
    }

    async countOptedOut(): Promise<number> {
        const result = await this.database.execute('SELECT COUNT(*) FROM UsageOptOut')

        return Number(result.rows[0]?.[0] ?? 0)
    }
}
