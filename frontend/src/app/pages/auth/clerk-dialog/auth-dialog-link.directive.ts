import { LocationStrategy } from '@angular/common'
import { computed, Directive, HostListener, inject, input } from '@angular/core'
import { Router } from '@angular/router'
import { ClerkService } from '../../../core/services/clerk.service'

const PATHS = { 'sign-in': '/login', 'sign-up': '/register' } as const

/**
 * A link to `/login` or `/register` (in place of `routerLink`) that opens Clerk's dialog on the spot when Clerk is
 * ready, so signing in is one step from anywhere (#343). Until Clerk has loaded, or if it can't, it goes to the page,
 * which opens the dialog itself. The address stays on the link, for new tabs and search engines.
 */
@Directive({
    selector: 'a[appAuthDialog]',
    host: { '[attr.href]': 'href()' },
})
export class AuthDialogLinkDirective {
    private readonly clerkService = inject(ClerkService)
    private readonly router = inject(Router)
    private readonly locationStrategy = inject(LocationStrategy)

    readonly appAuthDialog = input.required<'sign-in' | 'sign-up'>()

    public readonly href = computed(() => this.locationStrategy.prepareExternalUrl(PATHS[this.appAuthDialog()]))

    @HostListener('click', ['$event'])
    public onClick(event: MouseEvent): void {
        // A new tab or window keeps its usual behaviour.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        const kind = this.appAuthDialog()
        const opensDialog = this.clerkService.isAvailable() && (kind === 'sign-in' || this.clerkService.isSelfRegistrationEnabled())
        if (!opensDialog) {
            void this.router.navigateByUrl(PATHS[kind])
            return
        }
        if (kind === 'sign-in') this.clerkService.openSignIn()
        else this.clerkService.openSignUp()
    }
}
