import { HttpErrorResponse } from '@angular/common/http'

/**
 * Why Board Vault did not answer a request (#240):
 * - `timeout`: no answer in time (the request was cancelled in the browser);
 * - `network`: no answer at all (offline, refused, DNS, CORS; HTTP status 0);
 * - `server`: it answered with a 5xx, such as `503 DATABASE_TIMEOUT`.
 */
export type ApiUnavailableKind = 'timeout' | 'network' | 'server'

/**
 * A request Board Vault could not answer, as raised by `resilienceInterceptor`.
 *
 * It is still an `HttpErrorResponse` with the same status and body (0 for a timeout or no answer), so code that
 * reads `status` keeps working; new code tests `instanceof ApiUnavailableError` and `kind` instead.
 */
export class ApiUnavailableError extends HttpErrorResponse {
    readonly kind: ApiUnavailableKind
    /**
     * A write whose outcome is unknown: it timed out, lost its connection, a gateway gave up (504), or the database
     * timed out (503 `DATABASE_TIMEOUT`, #246) after it may have reached the API. It may have been saved, so the page says so instead of "it failed". Never set for reads.
     */
    readonly outcomeUnknown: boolean

    constructor(init: {
        kind: ApiUnavailableKind
        outcomeUnknown: boolean
        url: string
        status?: number
        statusText?: string
        error?: unknown
        headers?: HttpErrorResponse['headers']
    }) {
        super({
            error: init.error ?? null,
            headers: init.headers,
            status: init.status ?? 0,
            statusText: init.statusText ?? (init.kind === 'timeout' ? 'Request timed out' : 'Unknown Error'),
            url: init.url,
        })
        this.kind = init.kind
        this.outcomeUnknown = init.outcomeUnknown
    }
}

/** True for a write that may have been saved although it failed; see `ApiUnavailableError.outcomeUnknown`. */
export function isSaveOutcomeUnknown(error: unknown): boolean {
    return error instanceof ApiUnavailableError && error.outcomeUnknown
}
