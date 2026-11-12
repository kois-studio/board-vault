import { ErrorHandler, Injectable, inject } from '@angular/core'
import { ProblemReportService } from '../services/problem-report.service'

/** What zone.js hands Angular for a promise rejection nobody handled: the rejected value is in `rejection`. */
type ZoneRejection = Error & { rejection?: unknown }

/**
 * Angular's error handler, plus a problem report (#247, ADR-0028). It still logs to the console as before; the report
 * goes in the background and never throws.
 */
@Injectable()
export class ProblemErrorHandler extends ErrorHandler {
    private readonly problems = inject(ProblemReportService)

    override handleError(error: unknown): void {
        super.handleError(error)
        try {
            const rejection = (error as ZoneRejection | null)?.rejection
            if (rejection !== undefined && error instanceof Error && error.message.startsWith('Uncaught (in promise)')) {
                this.problems.reportError(rejection, 'rejection')
            } else {
                this.problems.reportError(error)
            }
        } catch {
            // Reporting must never add a problem of its own.
        }
    }
}

/**
 * Errors and rejections that happen outside Angular (a script, a callback zone.js does not see). Those inside Angular
 * reach `ProblemErrorHandler`, and an error seen by both is reported once.
 */
export function listenForProblems(target: Window, problems: ProblemReportService): void {
    target.addEventListener('error', (event: ErrorEvent) => {
        // A browser extension's script, or another site's ("Script error." with nothing in it), is not ours to fix.
        if (event.filename && !event.filename.startsWith(target.location.origin)) return
        if (!event.error && /^Script error\.?$/.test(event.message)) return
        problems.reportError(event.error ?? event.message)
    })
    target.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => problems.reportError(event.reason, 'rejection'))
}
