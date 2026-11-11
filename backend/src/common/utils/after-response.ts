import { waitUntil } from '@vercel/functions'

/** Where @vercel/functions finds the current request's context; it has `waitUntil` only inside a Vercel request. */
const VERCEL_REQUEST_CONTEXT = Symbol.for('@vercel/request-context')

type VercelRequestContext = { get?: () => { waitUntil?: unknown } | undefined }

/** True inside a Vercel request whose runtime keeps the function alive for work after the response. */
function canFinishAfterResponse(): boolean {
    const context = (globalThis as Record<symbol, VercelRequestContext | undefined>)[VERCEL_REQUEST_CONTEXT]

    return typeof context?.get?.()?.waitUntil === 'function'
}

/**
 * Runs `work` after the response when Vercel can keep the function alive for it (`waitUntil`), so the
 * request answers as soon as its own change is saved (#253). Anywhere else (locally, in tests, or if
 * the runtime offers no `waitUntil`) it is awaited as before: @vercel/functions' `waitUntil` silently
 * does nothing outside a Vercel request, and work left running after a response can be frozen and lost.
 *
 * Call it from the request's own code path, since the context is the current request's. `work` must catch and log
 * its own errors: after the response there is nobody left to report them to.
 */
export async function afterResponse(work: () => Promise<void>): Promise<void> {
    if (!canFinishAfterResponse()) return work()
    waitUntil(work())
}
