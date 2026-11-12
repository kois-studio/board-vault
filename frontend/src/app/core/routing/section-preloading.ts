import { Injectable, inject } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { type PreloadingStrategy, type Route } from '@angular/router'
import { EMPTY, from, lastValueFrom, type Observable, of } from 'rxjs'
import { filter, mergeMap, take } from 'rxjs/operators'
import { APP_SECTIONS } from '../../layout/app-sections'
import { LoginService } from '../services/login.service'

/** The pages of the three sections (Home, Collection, Play), as the header and tab bars link to them. */
const SECTION_PATHS = new Set(APP_SECTIONS.flatMap((section) => [section.path, ...(section.subsections ?? []).map((sub) => sub.path)]))
const ADMIN_PATH = 'admin'

type NetworkInformation = { saveData?: boolean; effectiveType?: string }

/** The browser asks to save data, or the connection is too slow for code nobody asked for yet. */
export function savesData(navigatorLike: Navigator = navigator): boolean {
    const connection = (navigatorLike as Navigator & { connection?: NetworkInformation }).connection
    return Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? '')
}

/** Resolves when the browser has a moment to spare (or after `timeout` ms at the latest). */
export function whenIdle(timeout = 2000): Promise<void> {
    return new Promise((resolve) => {
        if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout })
        else setTimeout(resolve, 200)
    })
}

/**
 * Loads the code of the sections' pages ahead of the first click into them (#264), so a first visit to Collection or
 * Play does not wait for its chunk. Only once you are signed in, one page at a time when the browser is idle, and never
 * when it asks to save data. Administration only for admins; every other page loads when it is opened, as before.
 */
@Injectable({ providedIn: 'root' })
export class SectionPreloadingStrategy implements PreloadingStrategy {
    private readonly login = inject(LoginService)
    private readonly signedIn$ = toObservable(this.login.isAuthenticated).pipe(filter(Boolean), take(1))
    /** One chunk after another, each in its own idle moment, so preloading never competes with the page in view. */
    private queue: Promise<unknown> = Promise.resolve()

    preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
        const path = route.path ?? ''
        const isAdmin = path === ADMIN_PATH
        if (!isAdmin && !SECTION_PATHS.has(`/${path}`)) return of(null)

        return this.signedIn$.pipe(
            mergeMap(() => from(this.inTurn(isAdmin, load))),
            mergeMap(() => EMPTY),
        )
    }

    private inTurn(isAdmin: boolean, load: () => Observable<unknown>): Promise<unknown> {
        const turn = this.queue.then(async () => {
            // A page that will not load ahead costs no idle wait; the router asks about it again after every navigation.
            if (!this.wanted(isAdmin)) return
            await whenIdle()
            // Checked again when its turn comes: the account may have signed out, or the browser started saving data.
            if (!this.wanted(isAdmin)) return
            // Until it completes: the router's `load()` for a page emits once at once, then again when its code arrives.
            // The router's `load()` completes only after it has preloaded the route's lazy children, and their turns queue
            // behind this one: a section page with lazy child routes would stall the queue. None has any today; if one
            // gets them, stop waiting here for them (e.g. resolve on the chunk, not on `load()` completing).
            await lastValueFrom(load(), { defaultValue: null })
        })
        // A chunk that fails to load is asked for again when its page is opened; the queue goes on.
        this.queue = turn.catch(() => undefined)
        return this.queue
    }

    private wanted(isAdmin: boolean): boolean {
        if (savesData() || !this.login.isAuthenticated()) return false
        return !isAdmin || this.login.isCurrentUserAdmin()
    }
}
