import {
    HttpContext,
    HttpContextToken,
    HttpErrorResponse,
    HttpEvent,
    HttpEventType,
    HttpInterceptorFn,
    HttpRequest,
} from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, Observable, retry, tap, throwError, timer } from 'rxjs'
import { ConnectivityService } from '../services/connectivity.service'
import { ApiUnavailableError } from '../utils/apiUnavailable'

/** A read with no answer after this long gives up (#240). */
export const READ_TIMEOUT_MS = 12_000
/** A write gets longer, since giving up leaves its outcome unknown. */
export const WRITE_TIMEOUT_MS = 20_000
/** The pause before the one retry of a read. */
export const READ_RETRY_DELAY_MS = 1_000

/** Overrides the time limit for one request, in milliseconds. */
export const REQUEST_TIMEOUT_MS = new HttpContextToken<number | null>(() => null)
/**
 * Whether a read that Board Vault could not answer is tried once more. Off for requests whose caller already
 * tries again on its own schedule (quiet polls, the sign-in handoff), so the two don't multiply.
 */
export const RETRY_READ = new HttpContextToken<boolean>(() => true)

/** Context for a read whose caller retries by itself; see `RETRY_READ`. */
export const withoutReadRetry = (context = new HttpContext()) => context.set(RETRY_READ, false)

/**
 * Marks a request sent with another method that only reads, such as a `POST` that carries its question in the body:
 * it is treated as a read (12 s, one retry, never "outcome unknown").
 */
export const READ_ONLY = new HttpContextToken<boolean>(() => false)

/** Context for a request that only reads although its method is not GET; see `READ_ONLY`. */
export const asReadOnly = (context = new HttpContext()) => context.set(READ_ONLY, true)

const READ_METHODS = new Set(['GET', 'HEAD'])
/** Statuses worth one more try: no answer, or a gateway or the API saying it is briefly unavailable. */
const RETRYABLE_STATUSES = new Set([0, 502, 503, 504])

/**
 * No request waits forever (#240, #237):
 * - reads (GET, HEAD, or marked `READ_ONLY`) give up after 12 s and are tried once more after 1 s when there was no answer, a timeout,
 *   or a 502/503/504; never after a 4xx or a 500;
 * - writes give up after 20 s and are never tried again (#246 makes some of them safe to repeat).
 *
 * The time limit counts from the start, including fetching the sign-in token, until the answer; with progress
 * events (an upload) it is the longest wait between two of them. A failure without a usable answer becomes an
 * `ApiUnavailableError`; every other error passes through untouched. Registered first, so a retry goes through
 * the other interceptors again (a fresh token).
 *
 * The final outcome, after the retry, tells `ConnectivityService` whether Board Vault can be reached (#241).
 */
export const resilienceInterceptor: HttpInterceptorFn = (req, next) => {
    const connectivity = inject(ConnectivityService)
    const isRead = READ_METHODS.has(req.method) || req.context.get(READ_ONLY)
    const limit = req.context.get(REQUEST_TIMEOUT_MS) ?? (isRead ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS)

    const attempt: Observable<HttpEvent<unknown>> = next(req).pipe(
        giveUpWhenSilent(limit, (sent) => unavailable(req, isRead, { kind: 'timeout', sent })),
        catchError((error: unknown) => throwError(() => asUnavailable(error, req, isRead))),
    )

    const outcome =
        !isRead || !req.context.get(RETRY_READ)
            ? attempt
            : attempt.pipe(
                  retry({
                      count: 1,
                      delay: (error: unknown) => (isRetryable(error) ? timer(READ_RETRY_DELAY_MS) : throwError(() => error)),
                  }),
              )

    return outcome.pipe(
        tap({
            next: (event) => {
                if (event.type === HttpEventType.Response) connectivity.reportAnswered()
            },
            error: (error: unknown) => reportFailure(connectivity, error),
        }),
    )
}

/**
 * Before the caller hears of it, so its error handling already knows (no toast while the banner shows). A failure a
 * retry could fix means Board Vault cannot be reached; a 4xx is an answer. A 500 is neither: Board Vault answered,
 * but with a bug in one place, which is no reason to say it cannot be reached nor that it is back. Errors that are
 * not HTTP answers (Clerk failing to give a token) say nothing about Board Vault. Either way, a Try again in
 * progress is over.
 */
function reportFailure(connectivity: ConnectivityService, error: unknown): void {
    if (isRetryable(error)) connectivity.reportUnreachable()
    else if (error instanceof HttpErrorResponse && error.status > 0 && error.status < 500) connectivity.reportAnswered()
    else connectivity.reportInconclusive()
}

/**
 * Errors with `error()` when nothing but the request being sent happened for `limit` ms. RxJS `timeout` would
 * restart its clock at the `Sent` event, letting a slow token plus a slow answer take twice the limit.
 * Unsubscribing on error cancels the request in the browser. `error` learns whether the request had left the browser.
 */
function giveUpWhenSilent(limit: number, error: (sent: boolean) => unknown) {
    return (source: Observable<HttpEvent<unknown>>) =>
        new Observable<HttpEvent<unknown>>((subscriber) => {
            let timer: ReturnType<typeof setTimeout> | undefined
            let sent = false
            const arm = () => {
                clearTimeout(timer)
                timer = setTimeout(() => subscriber.error(error(sent)), limit)
            }
            arm()
            const subscription = source.subscribe({
                next: (event) => {
                    if (event.type === HttpEventType.Sent) sent = true
                    else arm()
                    subscriber.next(event)
                },
                error: (cause: unknown) => subscriber.error(cause),
                complete: () => subscriber.complete(),
            })
            return () => {
                clearTimeout(timer)
                subscription.unsubscribe()
            }
        })
}

function isRetryable(error: unknown): boolean {
    return error instanceof ApiUnavailableError && (error.kind === 'timeout' || RETRYABLE_STATUSES.has(error.status))
}

function asUnavailable(error: unknown, req: HttpRequest<unknown>, isRead: boolean): unknown {
    if (error instanceof ApiUnavailableError || !(error instanceof HttpErrorResponse)) return error
    if (error.status === 0) return unavailable(req, isRead, { kind: 'network', from: error })
    if (error.status >= 500) return unavailable(req, isRead, { kind: 'server', from: error })
    return error
}

function unavailable(
    req: HttpRequest<unknown>,
    isRead: boolean,
    cause: { kind: 'timeout'; sent: boolean } | { kind: 'network' | 'server'; from: HttpErrorResponse },
): ApiUnavailableError {
    const from = 'from' in cause ? cause.from : null
    // A write that may have reached the API before the answer was lost. Not one that timed out before it left the
    // browser (still waiting for the sign-in token), nor a 5xx other than a gateway's 504: the API saying it did not do it.
    const mayHaveArrived = cause.kind === 'timeout' ? cause.sent : cause.kind === 'network' || from?.status === 504
    const outcomeUnknown = !isRead && mayHaveArrived
    return new ApiUnavailableError({
        kind: cause.kind,
        outcomeUnknown,
        url: from?.url ?? req.urlWithParams,
        status: from?.status ?? 0,
        statusText: from?.statusText,
        error: from?.error,
        headers: from?.headers,
    })
}
