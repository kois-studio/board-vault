import { Component, inject } from '@angular/core'
import { AccountPendingService } from '../../core/services/account-pending.service'
import { AccountPendingComponent } from '../account-pending/account-pending.component'
import { LayoutBottomTabsComponent } from '../bottom-tabs/bottom-tabs.component'
import { LayoutFooterComponent } from '../footer/footer.component'
import { LayoutHeaderComponent } from '../header/header.component'
import { LayoutSectionTabsComponent } from '../section-tabs/section-tabs.component'

/**
 * The first page's layout, drawn before that page can open (#259): while `AuthOnlyGuard` waits for Clerk, the
 * router has no layout on screen yet, so `AppComponent` shows this one. It is the same frame the layout then shows
 * while the account is confirmed, so the hand-over does not move anything.
 */
@Component({
    imports: [LayoutHeaderComponent, LayoutSectionTabsComponent, AccountPendingComponent, LayoutFooterComponent, LayoutBottomTabsComponent],
    selector: 'app-boot-frame',
    templateUrl: 'boot-frame.component.html',
})
export class BootFrameComponent {
    public readonly frame = inject(AccountPendingService).bootFrame
}
