import { Injectable } from '@nestjs/common'

/** What a request needs from its account: who it is and whether it may use the admin area. */
export type CachedAccount = {
    id: number
    email: string
    isAdmin: boolean
}

/** How long an instance trusts an account it read. Bounds how late a change made elsewhere is seen (ADR-0012). */
export const ACCOUNT_CACHE_TTL_MS = 60_000

/** Enough for every person active on one instance at once; the oldest entry goes first. */
export const ACCOUNT_CACHE_MAX_ENTRIES = 1_000

type Entry = { account: CachedAccount; expiresAt: number }

/**
 * Remembers, for a minute, which account a Clerk user is (#250), so a page that sends ten requests
 * reads the Account row once instead of ten times. It lives in this instance's memory only:
 *
 * - A deletion or an email change made here is seen at once, because the code that makes it calls
 *   `invalidateAccount`. Made on another instance, or straight in the database (the admin flag), it
 *   is seen within `ACCOUNT_CACHE_TTL_MS`.
 * - Only a successful resolution is kept. A failure (an unavailable account, a timeout, a conflict)
 *   is answered again on the next request.
 * - Requests for the same person that arrive together share one resolution.
 * - A resolution that started before an invalidation is handed to its requests but not kept, so it
 *   cannot bring back what the invalidation removed.
 */
@Injectable()
export class AccountCache {
    /** The clock; tests move it forward instead of waiting. */
    now: () => number = () => Date.now()

    private readonly entries = new Map<string, Entry>()
    private readonly inFlight = new Map<string, Promise<CachedAccount>>()
    private generation = 0

    async resolve(clerkUserId: string, load: () => Promise<CachedAccount>): Promise<CachedAccount> {
        const entry = this.entries.get(clerkUserId)

        if (entry && entry.expiresAt > this.now()) return entry.account
        if (entry) this.entries.delete(clerkUserId)

        const pending = this.inFlight.get(clerkUserId)

        if (pending) return pending

        const generation = this.generation
        const resolution = load().then(loaded => {
            const account: CachedAccount = { id: loaded.id, email: loaded.email, isAdmin: Boolean(loaded.isAdmin) }

            if (generation === this.generation) this.store(clerkUserId, account)
            return account
        })
        const settled = resolution.finally(() => {
            if (this.inFlight.get(clerkUserId) === settled) this.inFlight.delete(clerkUserId)
        })

        this.inFlight.set(clerkUserId, settled)
        return settled
    }

    /** Forget an account after changing it here, so the next request reads it again. */
    invalidateAccount(accountId: number): void {
        this.generation++
        // Deliberately clear all lookups in progress: this loses sharing, never correctness.
        this.inFlight.clear()
        for (const [clerkUserId, entry] of this.entries) {
            if (entry.account.id === accountId) this.entries.delete(clerkUserId)
        }
    }

    get size(): number {
        return this.entries.size
    }

    private store(clerkUserId: string, account: CachedAccount): void {
        this.entries.delete(clerkUserId)
        while (this.entries.size >= ACCOUNT_CACHE_MAX_ENTRIES) {
            const oldest = this.entries.keys().next().value

            if (oldest === undefined) break
            this.entries.delete(oldest)
        }
        this.entries.set(clerkUserId, { account, expiresAt: this.now() + ACCOUNT_CACHE_TTL_MS })
    }
}
