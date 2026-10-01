export type TimedProvider = 'database' | 'clerk'

/**
 * Upper bound for one call to a provider. A healthy Turso query or Clerk call
 * takes well under a second; past this, the request fails with 503 instead of
 * holding the function until Vercel kills it. Redis has its own, shorter
 * limit in CacheService.
 */
export const PROVIDER_TIMEOUT_MS: Record<TimedProvider, number> = {
    database: 5_000,
    clerk: 5_000,
}

export class ProviderTimeoutError extends Error {
    constructor(readonly provider: TimedProvider) {
        super(`${provider} call timed out`)
        this.name = 'ProviderTimeoutError'
    }
}

/** A `fetch` that aborts the request after the provider's limit. */
export function fetchWithTimeout(provider: TimedProvider, timeoutMs = PROVIDER_TIMEOUT_MS[provider]): typeof fetch {
    return async (input, init) => {
        const timeout = AbortSignal.timeout(timeoutMs)
        const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout

        try {
            return await fetch(input, { ...init, signal })
        } catch (error) {
            throw timeout.aborted ? new ProviderTimeoutError(provider) : error
        }
    }
}

/**
 * Stops waiting for a call whose client cannot be cancelled. The call itself
 * keeps running in the background; only the request is released.
 */
export async function withTimeout<T>(
    operation: Promise<T>,
    provider: TimedProvider,
    timeoutMs = PROVIDER_TIMEOUT_MS[provider],
): Promise<T> {
    let timer: NodeJS.Timeout | undefined

    try {
        return await Promise.race([
            operation,
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new ProviderTimeoutError(provider)), timeoutMs)
            }),
        ])
    } finally {
        clearTimeout(timer)
    }
}
