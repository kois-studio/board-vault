import { UnauthorizedException } from '@nestjs/common'

import { ACCOUNT_CACHE_MAX_ENTRIES, ACCOUNT_CACHE_TTL_MS, AccountCache, type CachedAccount } from './account-cache.js'

const carlos: CachedAccount = { id: 7, email: 'carlos@example.test', isAdmin: false }

/** A promise the test settles by hand, to hold a resolution in flight. */
function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<T>((onResolve, onReject) => {
        resolve = onResolve
        reject = onReject
    })

    return { promise, resolve, reject }
}

describe('AccountCache (#250)', () => {
    let cache: AccountCache
    let clock: number

    beforeEach(() => {
        cache = new AccountCache()
        clock = 1_000_000
        cache.now = () => clock
    })

    it('reads an account once and answers from memory until the TTL ends', async () => {
        const load = vi.fn().mockResolvedValue(carlos)

        await expect(cache.resolve('user_carlos', load)).resolves.toEqual(carlos)
        clock += ACCOUNT_CACHE_TTL_MS - 1
        await expect(cache.resolve('user_carlos', load)).resolves.toEqual(carlos)
        expect(load).toHaveBeenCalledTimes(1)

        clock += 1
        await cache.resolve('user_carlos', load)
        expect(load).toHaveBeenCalledTimes(2)
    })

    it('keeps only what a request needs from the account', async () => {
        const row = { ...carlos, username: 'carlos', locale: 'es', isAdmin: 1 }

        await expect(cache.resolve('user_carlos', vi.fn().mockResolvedValue(row))).resolves.toEqual({ ...carlos, isAdmin: true })
    })

    it('shares one read between requests that arrive together', async () => {
        const pending = deferred<CachedAccount>()
        const load = vi.fn().mockReturnValue(pending.promise)
        const burst = Array.from({ length: 10 }, () => cache.resolve('user_carlos', load))

        pending.resolve(carlos)

        await expect(Promise.all(burst)).resolves.toEqual(Array(10).fill(carlos))
        expect(load).toHaveBeenCalledTimes(1)
    })

    it('keeps people apart', async () => {
        const mario: CachedAccount = { id: 8, email: 'mario@example.test', isAdmin: true }

        await cache.resolve('user_carlos', vi.fn().mockResolvedValue(carlos))
        await cache.resolve('user_mario', vi.fn().mockResolvedValue(mario))

        await expect(cache.resolve('user_carlos', vi.fn())).resolves.toEqual(carlos)
        await expect(cache.resolve('user_mario', vi.fn())).resolves.toEqual(mario)
    })

    it('never keeps a failure: the next request tries again', async () => {
        const unavailable = new UnauthorizedException('The Board Vault account is unavailable')
        const load = vi.fn().mockRejectedValueOnce(unavailable).mockResolvedValueOnce(carlos)

        await expect(cache.resolve('user_carlos', load)).rejects.toBe(unavailable)
        await expect(cache.resolve('user_carlos', load)).resolves.toEqual(carlos)
        expect(load).toHaveBeenCalledTimes(2)
    })

    it('gives a shared failure to every request that waited on it, and keeps nothing', async () => {
        const pending = deferred<CachedAccount>()
        const load = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(carlos)
        const burst = [cache.resolve('user_carlos', load), cache.resolve('user_carlos', load)]
        const timeout = new Error('timeout')

        pending.reject(timeout)

        await expect(Promise.allSettled(burst)).resolves.toEqual([
            { status: 'rejected', reason: timeout },
            { status: 'rejected', reason: timeout },
        ])
        expect(cache.size).toBe(0)
        await expect(cache.resolve('user_carlos', load)).resolves.toEqual(carlos)
    })

    it('reads an account again right after it is invalidated', async () => {
        const deleted = new UnauthorizedException('The Board Vault account is unavailable')
        const load = vi.fn().mockResolvedValueOnce(carlos).mockRejectedValueOnce(deleted)

        await cache.resolve('user_carlos', load)
        cache.invalidateAccount(carlos.id)

        await expect(cache.resolve('user_carlos', load)).rejects.toBe(deleted)
    })

    it('invalidates only the account it is told about', async () => {
        const mario: CachedAccount = { id: 8, email: 'mario@example.test', isAdmin: false }
        const loadMario = vi.fn().mockResolvedValue(mario)

        await cache.resolve('user_carlos', vi.fn().mockResolvedValue(carlos))
        await cache.resolve('user_mario', loadMario)
        cache.invalidateAccount(carlos.id)

        expect(cache.size).toBe(1)
        await cache.resolve('user_mario', loadMario)
        expect(loadMario).toHaveBeenCalledTimes(1)
    })

    it('does not keep a read that started before an invalidation', async () => {
        const before = deferred<CachedAccount>()
        const load = vi
            .fn()
            .mockReturnValueOnce(before.promise)
            .mockResolvedValueOnce({ ...carlos, email: 'new@example.test' })
        const started = cache.resolve('user_carlos', load)

        // The email changes while the first read is still on its way with the old one.
        cache.invalidateAccount(carlos.id)
        before.resolve(carlos)
        await expect(started).resolves.toEqual(carlos)

        await expect(cache.resolve('user_carlos', load)).resolves.toEqual({ ...carlos, email: 'new@example.test' })
        expect(load).toHaveBeenCalledTimes(2)
    })

    it('starts a new read after an invalidation instead of joining the old one', async () => {
        const before = deferred<CachedAccount>()
        const load = vi
            .fn()
            .mockReturnValueOnce(before.promise)
            .mockResolvedValueOnce({ ...carlos, isAdmin: true })
        const started = cache.resolve('user_carlos', load)

        cache.invalidateAccount(carlos.id)
        const after = cache.resolve('user_carlos', load)

        before.resolve(carlos)
        await expect(started).resolves.toEqual(carlos)
        await expect(after).resolves.toEqual({ ...carlos, isAdmin: true })
        // The newer read is the one kept.
        await expect(cache.resolve('user_carlos', vi.fn())).resolves.toEqual({ ...carlos, isAdmin: true })
    })

    it('holds at most its bound, dropping the oldest entry first', async () => {
        for (let index = 0; index < ACCOUNT_CACHE_MAX_ENTRIES + 5; index++) {
            await cache.resolve(`user_${index}`, async () => ({ id: index, email: `${index}@example.test`, isAdmin: false }))
        }

        expect(cache.size).toBe(ACCOUNT_CACHE_MAX_ENTRIES)
        const oldest = vi.fn().mockResolvedValue({ id: 0, email: '0@example.test', isAdmin: false })
        const newest = vi.fn()

        await cache.resolve('user_0', oldest)
        await cache.resolve(`user_${ACCOUNT_CACHE_MAX_ENTRIES + 4}`, newest)
        expect(oldest).toHaveBeenCalledTimes(1)
        expect(newest).not.toHaveBeenCalled()
    })
})
