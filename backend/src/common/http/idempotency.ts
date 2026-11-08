import { createHash } from 'node:crypto'

import { HttpException, HttpStatus } from '@nestjs/common'

import { API_ERROR_CODES, BoardVaultHttpException } from './api-error.js'
import { ProviderTimeoutError } from './provider-timeout.js'

import type { DatabaseService } from '../../modules/common/database/database.service.js'
import type { IdempotencyRecord, StoredIdempotencyKey } from '../../modules/common/database/queries/idempotency.queries.js'

/** The request header that makes a creation safe to send again (#246). */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key'

/** A UUID, as the app creates with `crypto.randomUUID()`. Any version, any case. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Set on the request when the answer repeats an earlier creation, so it is not counted again (usage analytics). */
export type IdempotentRequest = { idempotentReplay?: boolean }

/** The key from the `Idempotency-Key` header: undefined without one, 400 when it is not a single UUID. */
export function readIdempotencyKey(header: string | Array<string> | undefined): string | undefined {
    if (header === undefined) return undefined
    if (typeof header !== 'string' || !UUID.test(header.trim())) {
        throw new BoardVaultHttpException(
            API_ERROR_CODES.IDEMPOTENCY_KEY_INVALID,
            HttpStatus.BAD_REQUEST,
            'The Idempotency-Key header must be a UUID.',
        )
    }
    return header.trim().toLowerCase()
}

/** A fingerprint of the request body, so the same key sent with a different request is refused. */
export function requestHash(body: unknown): string {
    return createHash('sha256').update(stableJson(body)).digest('hex')
}

function stableJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, item]) => item !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

        return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
    }
    return JSON.stringify(value) ?? 'null'
}

/**
 * Runs a creation at most once per account and key (#246).
 *
 * Without a key it just runs. With one, a key already used for this request returns the id it created without
 * running `create`, so a repeat is answered even if the group or the games changed since. `create` validates and
 * must write `record` in the same transaction as the new row (see `idempotencyStatement`): when two requests with
 * the same key race, the second fails on the key, rolls back, and returns the first one's id. The same key with
 * another route or body is refused (422); a key older than 24 hours is forgotten and can be used again.
 *
 * `completes` is true for the one request that should tell people and count the creation: the first that got past
 * the write. A write that committed but timed out leaves that to the retry. Every other request calls `onReplay`.
 */
export async function createOnce(
    databaseService: DatabaseService,
    request: { accountId: number; idempotencyKey: string | undefined; route: string; body: unknown; onReplay?: () => void },
    create: (record: IdempotencyRecord | undefined) => Promise<number>,
): Promise<{ id: number; completes: boolean }> {
    const { accountId, idempotencyKey, route, body, onReplay } = request

    if (!idempotencyKey) return { id: await create(undefined), completes: true }

    const record: IdempotencyRecord = { accountId, idempotencyKey, route, requestHash: requestHash(body) }
    const stored = await databaseService.idempotency.find(accountId, idempotencyKey)

    if (stored && !stored.expired) return replay(databaseService, stored, record, onReplay)
    if (stored) await databaseService.idempotency.forgetExpired(accountId, idempotencyKey)

    let id: number

    try {
        id = await create(record)
    } catch (error) {
        // A refusal or a timeout is answered as it is. Anything else may be another request with this key that
        // committed first (a UNIQUE conflict, however the driver words it): its row says so.
        if (error instanceof HttpException || error instanceof ProviderTimeoutError) throw error
        const winner = await databaseService.idempotency.find(accountId, idempotencyKey).catch(() => null)

        if (!winner || winner.expired) throw error
        return replay(databaseService, winner, record, onReplay)
    }

    return finish(databaseService, { id, completed: false }, record, onReplay)
}

async function replay(
    databaseService: DatabaseService,
    stored: StoredIdempotencyKey,
    record: IdempotencyRecord,
    onReplay: (() => void) | undefined,
): Promise<{ id: number; completes: boolean }> {
    if (stored.route !== record.route || stored.requestHash !== record.requestHash) {
        throw new BoardVaultHttpException(
            API_ERROR_CODES.IDEMPOTENCY_KEY_REUSED,
            HttpStatus.UNPROCESSABLE_ENTITY,
            'This Idempotency-Key was already used for a different request.',
        )
    }
    return finish(databaseService, { id: stored.resourceId, completed: stored.completed }, record, onReplay)
}

async function finish(
    databaseService: DatabaseService,
    created: { id: number; completed: boolean },
    record: IdempotencyRecord,
    onReplay: (() => void) | undefined,
): Promise<{ id: number; completes: boolean }> {
    const completes = !created.completed && (await databaseService.idempotency.claim(record.accountId, record.idempotencyKey))

    if (!completes) onReplay?.()
    return { id: created.id, completes }
}
