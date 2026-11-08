import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient } from '@libsql/client'
import { BadRequestException } from '@nestjs/common'

import { fakeDatabase } from '../../../test/fake-database.js'
import { idempotencyStatement } from '../../modules/common/database/queries/idempotency.queries.js'

import { BoardVaultHttpException } from './api-error.js'
import { createOnce, readIdempotencyKey, requestHash } from './idempotency.js'
import { ProviderTimeoutError } from './provider-timeout.js'

import type { IdempotencyRecord, StoredIdempotencyKey } from '../../modules/common/database/queries/idempotency.queries.js'

const KEY = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b'

/** The error SQLite really raises when a second request records the same key (migration 0031). */
async function realKeyConflict(): Promise<unknown> {
    const client = createClient({ url: ':memory:' })
    const migration = readFileSync(resolve(__dirname, '../../../../database/migrations/0031-add-idempotency-keys.sql'), 'utf8')
    const record = { accountId: 7, idempotencyKey: KEY, route: 'POST /sessions', requestHash: 'h' }

    try {
        await client.executeMultiple(`CREATE TABLE Account (id INTEGER PRIMARY KEY); INSERT INTO Account (id) VALUES (7); ${migration}`)
        await client.execute(idempotencyStatement(record, 1))
        await client.execute(idempotencyStatement(record, 2))
    } catch (error) {
        return error
    } finally {
        client.close()
    }
    throw new Error('expected the second key to be refused')
}

describe('readIdempotencyKey', () => {
    it('is undefined without the header', () => {
        expect(readIdempotencyKey(undefined)).toBeUndefined()
    })

    it('reads a UUID, in lower case', () => {
        expect(readIdempotencyKey(` ${KEY.toUpperCase()} `)).toBe(KEY)
    })

    it.each([[''], ['not-a-uuid'], [`${KEY}x`], [[KEY, KEY]]])('refuses %j with 400 IDEMPOTENCY_KEY_INVALID', header => {
        let error: unknown

        try {
            readIdempotencyKey(header as string)
        } catch (caught) {
            error = caught
        }

        expect(error).toBeInstanceOf(BoardVaultHttpException)
        expect((error as BoardVaultHttpException).getStatus()).toBe(400)
        expect((error as BoardVaultHttpException).getResponse()).toMatchObject({ code: 'IDEMPOTENCY_KEY_INVALID' })
    })
})

describe('requestHash', () => {
    it('is the same for the same request, whatever the order of its fields, and ignores missing ones', () => {
        expect(requestHash({ groupId: 1, games: [{ gameId: 2, ids: [3, 4] }], notes: undefined })).toBe(
            requestHash({ games: [{ ids: [3, 4], gameId: 2 }], groupId: 1 }),
        )
    })

    it('changes when the request changes, including the order of a list', () => {
        const base = requestHash({ groupId: 1, ids: [3, 4] })

        expect(requestHash({ groupId: 2, ids: [3, 4] })).not.toBe(base)
        expect(requestHash({ groupId: 1, ids: [4, 3] })).not.toBe(base)
    })
})

describe('createOnce', () => {
    const body = { groupId: 1 }
    const stored = (overrides: Partial<StoredIdempotencyKey> = {}): StoredIdempotencyKey => ({
        accountId: 7,
        idempotencyKey: KEY,
        route: 'POST /sessions',
        requestHash: requestHash(body),
        resourceId: 41,
        expired: false,
        completed: true,
        ...overrides,
    })
    const setup = (find = vi.fn<() => Promise<StoredIdempotencyKey | null>>().mockResolvedValue(null), claimed = true) => {
        const forgetExpired = vi.fn().mockResolvedValue({ rowsAffected: 1 })
        const claim = vi.fn().mockResolvedValue(claimed)
        const databaseService = fakeDatabase({ find, forgetExpired, claim })

        return { databaseService, find, forgetExpired, claim }
    }
    const creating = (result: number | Error | unknown) => {
        const create = vi.fn<(record: IdempotencyRecord | undefined) => Promise<number>>()

        if (typeof result === 'number') create.mockResolvedValue(result)
        else create.mockRejectedValue(result)
        return create
    }
    const run = (databaseService: ReturnType<typeof fakeDatabase>, create: ReturnType<typeof creating>, onReplay = vi.fn()) =>
        createOnce(databaseService, { accountId: 7, idempotencyKey: KEY, route: 'POST /sessions', body, onReplay }, create)

    it('just creates without a key, and that request completes it', async () => {
        const { databaseService, find, claim } = setup()
        const create = creating(42)

        const request = { accountId: 7, idempotencyKey: undefined, route: 'POST /sessions', body }

        await expect(createOnce(databaseService, request, create)).resolves.toEqual({ id: 42, completes: true })
        expect(create).toHaveBeenCalledWith(undefined)
        expect(find).not.toHaveBeenCalled()
        expect(claim).not.toHaveBeenCalled()
    })

    it('creates with the key recorded when the key is new, then claims what follows', async () => {
        const { databaseService, claim } = setup()
        const create = creating(42)
        const onReplay = vi.fn()

        await expect(run(databaseService, create, onReplay)).resolves.toEqual({ id: 42, completes: true })
        expect(create).toHaveBeenCalledWith({ accountId: 7, idempotencyKey: KEY, route: 'POST /sessions', requestHash: requestHash(body) })
        expect(claim).toHaveBeenCalledWith(7, KEY)
        expect(onReplay).not.toHaveBeenCalled()
    })

    it('answers a repeat with the first id, without creating, validating, or claiming again', async () => {
        const { databaseService, claim } = setup(vi.fn().mockResolvedValue(stored()))
        const create = creating(99)
        const onReplay = vi.fn()

        await expect(run(databaseService, create, onReplay)).resolves.toEqual({ id: 41, completes: false })
        expect(create).not.toHaveBeenCalled()
        expect(claim).not.toHaveBeenCalled()
        expect(onReplay).toHaveBeenCalledOnce()
    })

    it('lets the retry of a write that committed but timed out tell people and count it', async () => {
        const { databaseService, claim } = setup(vi.fn().mockResolvedValue(stored({ completed: false })))
        const onReplay = vi.fn()

        await expect(run(databaseService, creating(99), onReplay)).resolves.toEqual({ id: 41, completes: true })
        expect(claim).toHaveBeenCalledWith(7, KEY)
        expect(onReplay).not.toHaveBeenCalled()
    })

    it('leaves it to the request that claimed first when two finish at once', async () => {
        const { databaseService } = setup(vi.fn().mockResolvedValue(null), false)
        const onReplay = vi.fn()

        await expect(run(databaseService, creating(42), onReplay)).resolves.toEqual({ id: 42, completes: false })
        expect(onReplay).toHaveBeenCalledOnce()
    })

    it.each([
        ['another body', { requestHash: 'other' }],
        ['another route', { route: 'POST /sessions/scheduled' }],
    ])('refuses the key with 422 IDEMPOTENCY_KEY_REUSED for %s', async (_, overrides) => {
        const create = creating(99)
        const onReplay = vi.fn()
        const error = await run(setup(vi.fn().mockResolvedValue(stored(overrides))).databaseService, create, onReplay).catch(
            (caught: unknown) => caught,
        )

        expect((error as BoardVaultHttpException).getStatus()).toBe(422)
        expect((error as BoardVaultHttpException).getResponse()).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' })
        expect(create).not.toHaveBeenCalled()
        expect(onReplay).not.toHaveBeenCalled()
    })

    it('forgets an expired key and creates again', async () => {
        const { databaseService, forgetExpired } = setup(vi.fn().mockResolvedValue(stored({ expired: true, requestHash: 'other' })))

        await expect(run(databaseService, creating(42))).resolves.toEqual({ id: 42, completes: true })
        expect(forgetExpired).toHaveBeenCalledWith(7, KEY)
    })

    it('answers with the winner’s id when another request with the key committed first', async () => {
        const conflict = await realKeyConflict()
        const { databaseService } = setup(vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(stored()))
        const onReplay = vi.fn()

        await expect(run(databaseService, creating(conflict), onReplay)).resolves.toEqual({ id: 41, completes: false })
        expect(onReplay).toHaveBeenCalledOnce()
    })

    it('finds the winner however the driver words the conflict', async () => {
        const wrapped = new Error('batch failed', { cause: await realKeyConflict() })
        const { databaseService } = setup(vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(stored()))

        await expect(run(databaseService, creating(wrapped))).resolves.toEqual({ id: 41, completes: false })
    })

    it('rethrows the failure when no winner can be found, or looking fails too', async () => {
        const conflict = await realKeyConflict()
        const lookFails = vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('down'))

        await expect(run(setup().databaseService, creating(conflict))).rejects.toBe(conflict)
        await expect(run(setup(lookFails).databaseService, creating(conflict))).rejects.toBe(conflict)
    })

    it.each([
        ['a timeout', new ProviderTimeoutError('database')],
        ['a refusal', new BadRequestException('Every attendee must belong to the selected group')],
    ])('rethrows %s without looking again', async (_, failure) => {
        const { databaseService, find, claim } = setup()

        await expect(run(databaseService, creating(failure))).rejects.toBe(failure)
        expect(find).toHaveBeenCalledOnce()
        expect(claim).not.toHaveBeenCalled()
    })
})
