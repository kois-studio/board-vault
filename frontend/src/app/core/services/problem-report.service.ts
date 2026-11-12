import { HttpErrorResponse } from '@angular/common/http'
import { Injectable, InjectionToken, inject, isDevMode, LOCALE_ID } from '@angular/core'
import { environment } from '../../../environments/environment'
import { CurrentViewService } from './usage.service'

/** What went wrong (ADR-0028); the API adds `exception` for its own. */
export type ProblemKind = 'error' | 'rejection' | 'chunk' | 'request'

/**
 * Whether reports are sent: in production builds only. While developing, the console shows the problem, and unit tests
 * never reach the network.
 */
export const PROBLEM_REPORTS_ENABLED = new InjectionToken<boolean>('PROBLEM_REPORTS_ENABLED', { factory: () => !isDevMode() })

/** At most this many reports leave one visit, however much goes wrong in it. */
export const PROBLEMS_PER_VISIT = 10

/** A page whose code could not be fetched, usually a deploy that replaced it while the tab stayed open. */
const CHUNK_FAILURE =
    /Loading chunk|dynamically imported module|Importing a module script failed|error loading dynamically imported module/i

/** The request a problem is about, for `kind: 'request'`. */
export type ProblemRequest = { method: string; url: string; status: number; requestId: string | null }

/**
 * Tells Board Vault about problems the app runs into (#247, ADR-0028), so we learn of them without being told: what
 * broke, on which screen (a route template), in which build and language. Never who: no account, no address with ids,
 * nothing typed. The API scrubs the text again and keeps only a coarse browser family.
 *
 * Reports go with `fetch` and `keepalive`, outside `HttpClient`, so they survive leaving the page, never go through the
 * interceptors (no sign-in token, no time limit, no outage banner) and can never report themselves. A report that
 * cannot be sent is dropped. The same problem goes once per visit, and a visit sends at most `PROBLEMS_PER_VISIT`.
 */
@Injectable({ providedIn: 'root' })
export class ProblemReportService {
    private readonly currentView = inject(CurrentViewService)
    private readonly locale = inject(LOCALE_ID)
    private readonly enabled = inject(PROBLEM_REPORTS_ENABLED)
    private readonly sentKeys = new Set<string>()
    /** The same error object can reach both Angular's ErrorHandler and a window listener. */
    private readonly seenErrors = new WeakSet<object>()

    /** An error thrown or a promise rejected that nobody handled. A failed page chunk is told apart from the message. */
    reportError(error: unknown, kind: 'error' | 'rejection' = 'error'): void {
        if (typeof error === 'object' && error !== null) {
            if (this.seenErrors.has(error)) return
            this.seenErrors.add(error)
        }
        // An API failure that nobody handled was already reported by the interceptor as a request.
        if (error instanceof HttpErrorResponse) return
        const { name, message, stack } = describeThrown(error)
        this.send({ kind: CHUNK_FAILURE.test(message) ? 'chunk' : kind, name, message, stack })
    }

    /** An API call that got no answer in time or a 5xx, after its retry. */
    reportRequest(request: ProblemRequest, message: string): void {
        const path = pathOf(request.url)
        if (path === null) return
        this.send({
            kind: 'request',
            name: 'HttpErrorResponse',
            message,
            method: request.method,
            path,
            status: request.status,
            requestId: request.requestId ?? undefined,
        })
    }

    private send(problem: {
        kind: ProblemKind
        name: string
        message: string
        stack?: string
        method?: string
        path?: string
        status?: number
        requestId?: string
    }): void {
        if (!this.enabled) return
        const view = this.currentView.view() ?? undefined
        const key = JSON.stringify([problem.kind, problem.name, problem.message, problem.path, problem.status, view])
        if (this.sentKeys.has(key) || this.sentKeys.size >= PROBLEMS_PER_VISIT) return
        this.sentKeys.add(key)

        const body = {
            ...problem,
            name: problem.name.slice(0, 200),
            message: problem.message.slice(0, 2000),
            stack: problem.stack?.slice(0, 8000),
            view,
            release: environment.release || undefined,
            locale: this.locale.split('-')[0],
        }
        try {
            void fetch(`${environment.apiUrl}/problems`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                keepalive: true,
                credentials: 'omit',
            }).catch(() => undefined)
        } catch {
            // No fetch, or the browser refused it: the problem goes untold.
        }
    }
}

/**
 * A name, a message and a stack from whatever was thrown. Something that is not an error or a string (a rejected
 * object) is told by its kind and the names of its fields, never their values, which could be anything on the page.
 */
function describeThrown(error: unknown): { name: string; message: string; stack?: string } {
    if (error instanceof Error) return { name: error.name || 'Error', message: error.message || String(error), stack: error.stack }
    if (typeof error === 'string') return { name: 'Error', message: error }
    if (typeof error === 'object' && error !== null) {
        const kind = error.constructor?.name || 'Object'
        return { name: kind, message: `${kind} with ${Object.keys(error).slice(0, 10).join(', ') || 'no fields'}` }
    }
    return { name: typeof error, message: `A ${typeof error} was thrown` }
}

/** The path of an API address, or null for another site. The API replaces ids with `:id`. */
function pathOf(url: string): string | null {
    if (!url.startsWith(environment.apiUrl)) return null
    return url.slice(environment.apiUrl.length).split(/[?#]/)[0] || '/'
}
