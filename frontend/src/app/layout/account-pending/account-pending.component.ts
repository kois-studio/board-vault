import { Location } from '@angular/common'
import { Component, inject, input } from '@angular/core'
import { SkeletonHomeComponent } from '../../components/skeletons/skeleton-home/skeleton-home.component'
import { SkeletonPageComponent } from '../../components/skeletons/skeleton-page/skeleton-page.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { AccountPendingService } from '../../core/services/account-pending.service'
import { DataService } from '../../core/services/data.service'
import { HOME_LISTS } from '../../pages/dashboard-page/home-lists'
import { AuthHandoffComponent } from '../auth-handoff/auth-handoff.component'

/**
 * Stands in for the page while a signed-in person's account is not known yet (#259): a page skeleton, or the
 * handoff card once finishing sign-in is slow, fails, or cannot reach Board Vault (AccountPendingService).
 *
 * On its way to Home (#343) it shows Home's own skeleton, which Home keeps while its lists load, so there is one
 * loading screen from the first paint to the content; and it names Home's lists, so they load as soon as the
 * account is known instead of after Home has rendered.
 */
@Component({
    imports: [AuthHandoffComponent, ContainerWrapperComponent, SkeletonHomeComponent, SkeletonPageComponent],
    selector: 'app-account-pending',
    templateUrl: 'account-pending.component.html',
})
export class AccountPendingComponent {
    public readonly showsHandoffCard = inject(AccountPendingService).showsHandoffCard

    /** True in layouts without a header and footer (focused pages), so the screen fills the whole height. */
    public readonly fillsViewport = input(false)

    /** On the way to Home. The router has no URL yet during the first navigation, so this reads the address. */
    public readonly isHome = ['', '/dashboard'].includes(inject(Location).path().split(/[?#]/)[0] ?? '')

    constructor() {
        if (this.isHome) inject(DataService).use(HOME_LISTS)
    }
}
