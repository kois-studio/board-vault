import { DestroyRef, effect, inject } from '@angular/core'
import { ToastService } from '../../../components/toast/toast.service'
import { ClerkService } from '../../../core/services/clerk.service'

/**
 * Opens Clerk's sign-in or sign-up dialog once Clerk is ready, for the page that calls it (#343): `/login` and
 * `/register` are the landing page with the dialog open over it, so links, guards and "your session expired" keep
 * landing somewhere that asks. Called from a constructor. When Clerk can't load, a toast says so.
 */
export function openClerkDialogWhenReady(kind: 'sign-in' | 'sign-up'): void {
    const clerkService = inject(ClerkService)
    const toastService = inject(ToastService)
    let done = false

    const watcher = effect(() => {
        if (done || !clerkService.isLoaded()) return
        done = true
        if (clerkService.isAvailable()) {
            if (kind === 'sign-in') clerkService.openSignIn()
            else clerkService.openSignUp()
        } else {
            toastService.warning(
                $localize`:Toast on the sign-in and sign-up pages when the sign-in service does not load:Sign-in isn’t available right now. Refresh the page to try again.`,
            )
        }
    })
    inject(DestroyRef).onDestroy(() => watcher.destroy())
}
