import { HttpInterceptorFn } from '@angular/common/http'
import { DestroyRef, effect, Injectable, Injector, inject, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router'
import { filter } from 'rxjs'
import { environment } from '../../../environments/environment'
import { Api } from '../../api/api'
import { LoginService } from './login.service'

/** The pattern the API accepts for a screen (ADR-0021): a route template, never an address with ids. */
const VIEW_PATTERN = /^\/$|^(\/([a-z][a-z0-9-]*|:[a-zA-Z]+))+$/

/** `/groups/:groupId` for the route shown now: the configured paths, not the address. */
export function routeTemplate(root: ActivatedRouteSnapshot): string {
    const segments: Array<string> = []
    let route: ActivatedRouteSnapshot | null = root
    while (route) {
        const path = route.routeConfig?.path
        if (path) segments.push(...path.split('/').filter(Boolean))
        route = route.firstChild
    }
    const view = `/${segments.join('/')}`
    return view.length <= 80 && VIEW_PATTERN.test(view) ? view : '/'
}

/** The screen shown now, as a route template, for the `X-Board-Vault-View` header. */
@Injectable({ providedIn: 'root' })
export class CurrentViewService {
    readonly view = signal<string | null>(null)
}

/** API requests say which screen they came from, so an action knows where it started (ADR-0021). */
export const usageViewInterceptor: HttpInterceptorFn = (req, next) => {
    const view = inject(CurrentViewService).view()
    if (!view || !req.url.startsWith(environment.apiUrl)) return next(req)
    return next(req.clone({ setHeaders: { 'X-Board-Vault-View': view } }))
}

/**
 * Usage statistics of our own (ADR-0021): while signed in, each page shown is counted with the page
 * before it. Nothing is stored in the browser; the previous page lives in memory only. Whether the
 * account counts is decided by the API (Settings → Privacy).
 */
@Injectable({ providedIn: 'root' })
export class UsageService {
    private readonly router = inject(Router)
    private readonly api = inject(Api)
    private readonly loginService = inject(LoginService)
    private readonly currentView = inject(CurrentViewService)
    private readonly injector = inject(Injector)
    /** The page shown before this one, and whether this one was counted yet. */
    private from: string | null = null
    private counted = false

    start(destroyRef: DestroyRef): void {
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(destroyRef),
            )
            .subscribe(() => {
                const page = routeTemplate(this.router.routerState.snapshot.root)
                const previous = this.currentView.view()
                // The same page again (a fragment, a query) is not a new view.
                if (page === previous) return
                this.from = previous
                this.counted = false
                this.currentView.view.set(page)
                this.count()
            })
        // On a fresh load the page shows before sign-in finishes: count it once it does.
        effect(
            () => {
                if (this.loginService.isAuthenticated()) untracked(() => this.count())
            },
            { injector: this.injector },
        )
    }

    private count(): void {
        const page = this.currentView.view()
        // Admin pages are ours, not the product's.
        if (this.counted || !page || page.startsWith('/admin') || !this.loginService.isAuthenticated()) return
        this.counted = true
        this.api.recordNavigation(page, this.from ?? undefined).subscribe({ error: () => undefined })
    }
}
