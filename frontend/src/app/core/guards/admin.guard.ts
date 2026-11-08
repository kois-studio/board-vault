// src/app/core/guards/admin.guard.ts
import { inject } from '@angular/core'
import { CanActivateFn, Router, UrlTree } from '@angular/router'
import { from, Observable, of } from 'rxjs'
import { switchMap } from 'rxjs/operators'
import { ToastService } from '../../components/toast/toast.service'
import { ClerkService } from '../services/clerk.service'
import { LogService } from '../services/log.service'
import { LoginService } from '../services/login.service'

// Administration stays in English (ADR-0024), but this toast reaches people who aren't operators.
const accessDenied = () =>
    $localize`:Toast when someone who isn't an operator opens an Administration address:Access Denied: You do not have permission to view this page.`

export const AdminGuard: CanActivateFn = (_route, state): Observable<boolean | UrlTree> | boolean => {
    const loginService = inject(LoginService)
    const clerkService = inject(ClerkService)
    const router = inject(Router)
    const toastService = inject(ToastService)
    const logger = inject(LogService)

    const decideForKnownAccount = (): boolean => {
        if (loginService.isCurrentUserAdmin()) {
            logger.log('AdminGuard: Access granted (authenticated as admin).')
            return true
        }

        logger.warn('AdminGuard: Access denied (authenticated but not admin).')
        toastService.error(accessDenied())
        router.navigate(['/dashboard'])
        return false
    }

    // 1. Already authenticated in this session
    if (loginService.isAuthenticated()) return decideForKnownAccount()

    return from(clerkService.whenLoaded()).pipe(
        switchMap((): Observable<boolean | UrlTree> => {
            if (loginService.isAuthenticated()) return of(decideForKnownAccount())

            // 2. Signed in, account still being resolved. Administration cannot open before the admin flag is
            // known, and waiting here would leave a blank page for as long as Board Vault takes to answer, up to
            // the request timeout, or for the whole outage (#239). Home shows the handoff screen ("Connecting
            // you…" or "can't reach Board Vault") meanwhile, and this page opens again once the account is known,
            // which runs this guard again with the admin flag.
            if (clerkService.isSignedIn()) {
                logger.log('AdminGuard: Account still being resolved; opening Administration once it is known.')
                loginService.openOnceAccountIsKnown(state.url)
                return of(router.createUrlTree(['/dashboard']))
            }

            // 3. Not signed in. LoginService clears the session and opens the landing page; send the person
            // to sign in instead, with a word on why.
            logger.log('AdminGuard: Not signed in. Redirecting to login.')
            return loginService.verifySession().pipe(
                switchMap(() => {
                    toastService.info(
                        $localize`:Toast when someone signed out opens an Administration address:Please log in with admin credentials to access this area.`,
                    )
                    router.navigate(['/login'], { queryParams: { returnUrl: state.url } })
                    return of(false)
                }),
            )
        }),
    )
}
