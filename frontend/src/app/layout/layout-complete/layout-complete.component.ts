import { Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { AccountPendingService } from '../../core/services/account-pending.service'
import { LoginService } from '../../core/services/login.service'
import { AccountPendingComponent } from '../account-pending/account-pending.component'
import { LayoutBottomTabsComponent } from '../bottom-tabs/bottom-tabs.component'
import { ConnectivityBannerComponent } from '../connectivity-banner/connectivity-banner.component'
import { LayoutFooterComponent } from '../footer/footer.component'
import { LayoutHeaderComponent } from '../header/header.component'
import { LayoutSectionTabsComponent } from '../section-tabs/section-tabs.component'
import { UsageNoticeComponent } from '../usage-notice/usage-notice.component'

/**
 * General layout with header and footer.
 *
 * While a signed-in account is still being resolved it shows the app's frame with a page skeleton, and the handoff
 * card once that is slow or fails, instead of the page (#259).
 */
@Component({
    imports: [
        RouterOutlet,
        LayoutHeaderComponent,
        LayoutFooterComponent,
        LayoutSectionTabsComponent,
        LayoutBottomTabsComponent,
        AccountPendingComponent,
        UsageNoticeComponent,
        ConnectivityBannerComponent,
    ],
    selector: 'app-layout-complete',
    templateUrl: 'layout-complete.component.html',
})
export class LayoutCompleteComponent {
    private readonly loginService = inject(LoginService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // loginService
    public readonly isAuthenticated = this.loginService.isAuthenticated
    public readonly isClerkAuthHandoffActive = this.loginService.isClerkAuthHandoffActive
    public readonly showsAppFrame = inject(AccountPendingService).showsAppFrame
}
