import { Component, inject, input } from '@angular/core'
import { SkeletonPageComponent } from '../../components/skeletons/skeleton-page/skeleton-page.component'
import { AccountPendingService } from '../../core/services/account-pending.service'
import { AuthHandoffComponent } from '../auth-handoff/auth-handoff.component'

/**
 * Stands in for the page while a signed-in person's account is not known yet (#259): a page skeleton, or the
 * handoff card once finishing sign-in is slow, fails, or cannot reach Board Vault (AccountPendingService).
 */
@Component({
    imports: [AuthHandoffComponent, SkeletonPageComponent],
    selector: 'app-account-pending',
    templateUrl: 'account-pending.component.html',
})
export class AccountPendingComponent {
    public readonly showsHandoffCard = inject(AccountPendingService).showsHandoffCard

    /** True in layouts without a header and footer (focused pages), so the screen fills the whole height. */
    public readonly fillsViewport = input(false)
}
