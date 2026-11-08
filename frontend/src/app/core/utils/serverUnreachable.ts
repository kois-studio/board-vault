import { HttpErrorResponse } from '@angular/common/http'
import { TimeoutError } from 'rxjs'

/**
 * Whether a failed request means Board Vault could not be reached, rather than that it refused the request:
 * no answer (status 0: offline, refused, CORS on a crashed function), a timeout, or a 5xx such as the API's
 * `503 DATABASE_TIMEOUT`. These say nothing about the session, so nobody is signed out for them (#237).
 */
export function isServerUnreachable(error: unknown): boolean {
    if (error instanceof TimeoutError) return true
    if (error instanceof HttpErrorResponse) return error.status === 0 || error.status >= 500
    // Not an HTTP answer, for example Clerk failing to fetch a token: only the browser being offline is clearly ours.
    return typeof navigator !== 'undefined' && navigator.onLine === false
}
