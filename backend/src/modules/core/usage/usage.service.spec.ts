import { Logger } from '@nestjs/common'

import { UsageService } from './usage.service.js'

import type { DatabaseService } from '../../common/database/database.service.js'

const VERCEL_REQUEST_CONTEXT = Symbol.for('@vercel/request-context')
const contexts = globalThis as Record<symbol, unknown>

/** Settles on the next turn of the event loop: true if `promise` has resolved by then. */
async function hasResolved(promise: Promise<unknown>): Promise<boolean> {
    let resolved = false

    void promise.then(() => (resolved = true))
    await new Promise(resolve => setTimeout(resolve, 0))
    return resolved
}

/** An insert that only finishes, or fails, when the test says so. */
function heldInsert() {
    let finish!: () => void
    let fail!: (error: Error) => void
    const done = new Promise<void>((resolve, reject) => ((finish = resolve), (fail = reject)))
    const record = vi.fn(async () => done)

    return { record, finish, fail }
}

/** A DatabaseService whose only query is the usage insert (groupActivity has a `record` too). */
const usageDatabase = (record: unknown) => ({ usage: { record } }) as unknown as DatabaseService

// #299: counting a request never makes it wait on Vercel, and is awaited anywhere else.
describe('UsageService.record', () => {
    let warn: ReturnType<typeof vi.spyOn>
    const previousSecret = process.env.USAGE_PSEUDONYM_SECRET

    beforeEach(() => {
        process.env.USAGE_PSEUDONYM_SECRET = 'test-secret'
        warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    })

    afterEach(() => {
        if (previousSecret === undefined) delete process.env.USAGE_PSEUDONYM_SECRET
        else process.env.USAGE_PSEUDONYM_SECRET = previousSecret
        delete contexts[VERCEL_REQUEST_CONTEXT]
        warn.mockRestore()
    })

    it('waits for the insert outside Vercel, as locally and in tests', async () => {
        const { record, finish } = heldInsert()
        const recording = new UsageService(usageDatabase(record)).record(4, 'game_added', '/games/:gameId')

        expect(record).toHaveBeenCalledWith(4, expect.objectContaining({ name: 'game_added', view: '/games/:gameId', fromView: null }))
        expect(await hasResolved(recording)).toBe(false)
        finish()
        expect(await hasResolved(recording)).toBe(true)
    })

    it('answers without waiting for the insert inside a Vercel request, and hands it to waitUntil', async () => {
        const waitUntil = vi.fn()

        contexts[VERCEL_REQUEST_CONTEXT] = { get: () => ({ waitUntil }) }
        const { record, finish } = heldInsert()

        expect(await hasResolved(new UsageService(usageDatabase(record)).record(4, 'game_added'))).toBe(true)
        expect(record).toHaveBeenCalledOnce()
        expect(waitUntil).toHaveBeenCalledOnce()

        const kept = waitUntil.mock.calls[0]?.[0] as Promise<void>

        expect(await hasResolved(kept)).toBe(false)
        finish()
        expect(await hasResolved(kept)).toBe(true)
    })

    it('logs a failed insert after the response instead of rejecting what Vercel keeps alive', async () => {
        const waitUntil = vi.fn()

        contexts[VERCEL_REQUEST_CONTEXT] = { get: () => ({ waitUntil }) }
        const { record, fail } = heldInsert()

        await new UsageService(usageDatabase(record)).record(4, 'review_saved')
        fail(new Error('database down'))

        await expect(waitUntil.mock.calls[0]?.[0]).resolves.toBeUndefined()
        expect(warn).toHaveBeenCalledWith(JSON.stringify({ event: 'usage.record_failed', usageEvent: 'review_saved', error: 'Error' }))
    })

    it('never fails the request when the insert fails outside Vercel', async () => {
        const record = vi.fn(async () => Promise.reject(new Error('database down')))

        await expect(new UsageService(usageDatabase(record)).record(4, 'review_saved')).resolves.toBeUndefined()
        expect(warn).toHaveBeenCalledWith(JSON.stringify({ event: 'usage.record_failed', usageEvent: 'review_saved', error: 'Error' }))
    })

    it('hands nothing to waitUntil and inserts nothing without a pseudonym secret', async () => {
        delete process.env.USAGE_PSEUDONYM_SECRET
        const waitUntil = vi.fn()
        const record = vi.fn()

        contexts[VERCEL_REQUEST_CONTEXT] = { get: () => ({ waitUntil }) }
        await new UsageService(usageDatabase(record)).record(4, 'game_added')

        expect(record).not.toHaveBeenCalled()
        expect(waitUntil).not.toHaveBeenCalled()
    })
})
