import { afterResponse } from './after-response.js'

const VERCEL_REQUEST_CONTEXT = Symbol.for('@vercel/request-context')
const contexts = globalThis as Record<symbol, unknown>

/** Work that only finishes when the test says so. */
function heldWork() {
    let finish!: () => void
    const done = new Promise<void>(resolve => (finish = resolve))
    const work = vi.fn(async () => done)

    return { work, finish }
}

/** Settles on the next turns of the event loop: true if `promise` has resolved by then. */
async function hasResolved(promise: Promise<unknown>): Promise<boolean> {
    let resolved = false

    void promise.then(() => (resolved = true))
    await new Promise(resolve => setTimeout(resolve, 0))
    return resolved
}

describe('afterResponse', () => {
    afterEach(() => {
        delete contexts[VERCEL_REQUEST_CONTEXT]
    })

    it('waits for the work outside Vercel, as locally and in tests', async () => {
        const { work, finish } = heldWork()
        const running = afterResponse(work)

        expect(work).toHaveBeenCalledOnce()
        expect(await hasResolved(running)).toBe(false)
        finish()
        expect(await hasResolved(running)).toBe(true)
    })

    it('hands the work to waitUntil inside a Vercel request and answers without waiting for it', async () => {
        const waitUntil = vi.fn()

        contexts[VERCEL_REQUEST_CONTEXT] = { get: () => ({ waitUntil }) }
        const { work, finish } = heldWork()

        expect(await hasResolved(afterResponse(work))).toBe(true)
        expect(work).toHaveBeenCalledOnce()
        expect(waitUntil).toHaveBeenCalledOnce()

        const kept = waitUntil.mock.calls[0]?.[0] as Promise<void>

        expect(await hasResolved(kept)).toBe(false)
        finish()
        expect(await hasResolved(kept)).toBe(true)
    })

    it('waits for the work when the Vercel context has no request or no waitUntil', async () => {
        for (const context of [{ get: () => undefined }, { get: () => ({}) }, {}]) {
            contexts[VERCEL_REQUEST_CONTEXT] = context
            const { work, finish } = heldWork()
            const running = afterResponse(work)

            expect(await hasResolved(running)).toBe(false)
            finish()
            expect(await hasResolved(running)).toBe(true)
        }
    })

    it('passes a failure on to the caller when it waits', async () => {
        await expect(afterResponse(async () => Promise.reject(new Error('database down')))).rejects.toThrow('database down')
    })
})
