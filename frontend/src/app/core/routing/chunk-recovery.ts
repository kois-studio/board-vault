import { DOCUMENT, Location } from '@angular/common'
import { inject } from '@angular/core'
import { NavigationError } from '@angular/router'
import { isChunkFailure } from '../services/problem-report.service'

/** Where the last reload for missing page code is remembered, so a failure that a reload does not fix stays one. */
export const CHUNK_RELOAD_KEY = 'bv-chunk-reload'
/** A second failure within this long of the last reload is left alone: reloading again would loop. */
export const CHUNK_RELOAD_GUARD_MS = 30_000

/**
 * A navigation whose page code could not be loaded (#354), usually because a deploy replaced it while the tab stayed
 * open: the page is loaded in full at the address it was going to, which brings the new build. Once per
 * `CHUNK_RELOAD_GUARD_MS`, and never without `sessionStorage` to remember it, so a chunk that is really broken
 * cannot reload in a loop. The failure is still reported (ADR-0028); the report survives the reload.
 *
 * For `withNavigationErrorHandler`, which runs it in an injection context.
 */
export function reloadOnChunkFailure(error: NavigationError): void {
    const cause: unknown = error.error
    const message = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : ''
    if (!isChunkFailure(message)) return

    const document = inject(DOCUMENT)
    const window = document.defaultView
    if (!window) return
    const now = Date.now()
    try {
        const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY))
        if (Number.isFinite(last) && now - last < CHUNK_RELOAD_GUARD_MS) return
        window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
    } catch {
        return
    }
    window.location.assign(inject(Location).prepareExternalUrl(error.url))
}
