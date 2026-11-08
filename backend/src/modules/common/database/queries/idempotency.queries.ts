import type { DatabaseService } from '../database.service.js'
import type { InStatement } from '@libsql/client'

/** How long a key protects against a repeat (#246). Older keys are forgotten and deleted by the daily job. */
export const IDEMPOTENCY_KEY_HOURS = 24

/** The first result of a creation sent with an `Idempotency-Key`. */
export type IdempotencyRecord = {
    accountId: number
    idempotencyKey: string
    route: string
    requestHash: string
}

/** `completed`: a request with this key already went on to tell people and count the creation (`claim`). */
export type StoredIdempotencyKey = IdempotencyRecord & { resourceId: number; expired: boolean; completed: boolean }

/** `Idempotency-Key` records (#246): which creation a key already made, written in the same transaction. */
export class IdempotencyQueries {
    constructor(private readonly database: DatabaseService) {}

    async find(accountId: number, idempotencyKey: string): Promise<StoredIdempotencyKey | null> {
        const result = await this.database.execute({
            sql: `
                SELECT route, requestHash, resourceId, createdAt <= datetime('now', ?) AS expired, completedAt IS NOT NULL AS completed
                FROM IdempotencyKey
                WHERE accountId = ? AND idempotencyKey = ?
            `,
            args: [`-${IDEMPOTENCY_KEY_HOURS} hours`, accountId, idempotencyKey],
        })
        const row = result.rows[0]

        if (!row) return null
        return {
            accountId,
            idempotencyKey,
            route: String(row[0]),
            requestHash: String(row[1]),
            resourceId: Number(row[2]),
            expired: Boolean(Number(row[3])),
            completed: Boolean(Number(row[4])),
        }
    }

    /**
     * Claims what follows the write (telling people, counting it) for one request with this key: true for the first
     * request that asks, false once another one has.
     */
    async claim(accountId: number, idempotencyKey: string): Promise<boolean> {
        const result = await this.database.execute({
            sql: 'UPDATE IdempotencyKey SET completedAt = CURRENT_TIMESTAMP WHERE accountId = ? AND idempotencyKey = ? AND completedAt IS NULL',
            args: [accountId, idempotencyKey],
        })

        return result.rowsAffected === 1
    }

    /** Forgets one expired key, so it can be used again. */
    forgetExpired(accountId: number, idempotencyKey: string) {
        return this.database.execute({
            sql: `DELETE FROM IdempotencyKey WHERE accountId = ? AND idempotencyKey = ? AND createdAt <= datetime('now', ?)`,
            args: [accountId, idempotencyKey, `-${IDEMPOTENCY_KEY_HOURS} hours`],
        })
    }

    /** Deletes every expired key (daily job). */
    deleteExpired() {
        return this.database.execute({
            sql: `DELETE FROM IdempotencyKey WHERE createdAt <= datetime('now', ?)`,
            args: [`-${IDEMPOTENCY_KEY_HOURS} hours`],
        })
    }
}

/**
 * The statement that records a key, for the transaction that creates `resourceId`. A second request with the same
 * key fails it with a UNIQUE constraint, so its transaction rolls back and creates nothing.
 */
export function idempotencyStatement(record: IdempotencyRecord, resourceId: number): InStatement {
    return {
        sql: 'INSERT INTO IdempotencyKey (accountId, idempotencyKey, route, requestHash, resourceId) VALUES (?, ?, ?, ?, ?)',
        args: [record.accountId, record.idempotencyKey, record.route, record.requestHash, resourceId],
    }
}
