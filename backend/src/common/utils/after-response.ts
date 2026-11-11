/**
 * Where the Vercel Node runtime puts the current request's context; it has `waitUntil` only inside a
 * Vercel request. This is the symbol `@vercel/functions` reads too: reading it here saves that package
 * and its dependencies for one call.
 */
const VERCEL_REQUEST_CONTEXT = Symbol.for('@vercel/request-context')

type VercelRequest = { waitUntil?: unknown }
type VercelRequestContext = { get?: () => VercelRequest | undefined }

/** The current Vercel request when its runtime keeps the function alive for work after the response. */
function vercelRequest(): (VercelRequest & { waitUntil: (promise: Promise<unknown>) => void }) | null {
    const request = (globalThis as Record<symbol, VercelRequestContext | undefined>)[VERCEL_REQUEST_CONTEXT]?.get?.()

    return typeof request?.waitUntil === 'function' ? (request as VercelRequest & { waitUntil: (promise: Promise<unknown>) => void }) : null
}

/**
 * Runs `work` after the response when Vercel can keep the function alive for it (`waitUntil`), so the
 * request answers as soon as its own change is saved (#253). Anywhere else (locally, in tests, or if
 * the runtime offers no `waitUntil`) it is awaited as before: work left running after a response can
 * be frozen and lost.
 *
 * Call it from the request's own code path, since the context is the current request's. `work` must catch and log
 * its own errors: after the response there is nobody left to report them to.
 */
export async function afterResponse(work: () => Promise<void>): Promise<void> {
    const request = vercelRequest()

    if (!request) return work()
    request.waitUntil(work())
}
