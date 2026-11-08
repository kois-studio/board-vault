import { afterNextRender, Component, computed, ElementRef, effect, Injector, inject, untracked, viewChild } from '@angular/core'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ConnectivityService } from '../../core/services/connectivity.service'
import { LoginService } from '../../core/services/login.service'

/**
 * One calm, persistent notice while Board Vault cannot be reached (#241), under the header of both layouts.
 * It replaces the error toasts the loads would otherwise stack, goes away by itself on the next answer, and its
 * Try again reloads what failed.
 *
 * Only once the account is known (`isAuthenticated`): before that, the sign-in handoff screen says it already
 * (#238). The `role="status"` region stays in the page, so screen readers announce the notice when it appears.
 */
@Component({
    imports: [ButtonComponent, IconComponent],
    selector: 'app-connectivity-banner',
    templateUrl: 'connectivity-banner.component.html',
})
export class ConnectivityBannerComponent {
    private readonly connectivity = inject(ConnectivityService)
    private readonly loginService = inject(LoginService)
    private readonly injector = inject(Injector)
    private readonly retryButton = viewChild('retryButton', { read: ElementRef<HTMLButtonElement> })

    public readonly isShown = computed(() => this.connectivity.isDegraded() && this.loginService.isAuthenticated())
    public readonly isChecking = this.connectivity.isChecking

    /** Try again was pressed: once the check ends, focus goes back somewhere useful (the button is disabled meanwhile). */
    private returnFocus = false

    constructor() {
        effect(() => {
            if (this.isChecking() || !this.returnFocus) return
            this.returnFocus = false
            const stillShown = untracked(this.isShown)
            afterNextRender(
                () => {
                    // Still unreachable: back on Try again. Back again: the banner is gone, so the page it was above.
                    const target = stillShown ? this.retryButton()?.nativeElement : document.getElementById('main-content')
                    target?.focus()
                },
                { injector: this.injector },
            )
        })
    }

    public retry(): void {
        this.returnFocus = true
        this.connectivity.retry()
    }
}
