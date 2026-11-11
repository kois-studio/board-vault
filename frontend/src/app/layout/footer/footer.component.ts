import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { GithubMarkComponent } from '../../components/ui/github-mark/github-mark.component'
import { LogoComponent } from '../../components/ui/logo/logo.component'
import { ThemeSwitchComponent } from '../../components/ui/theme-switch/theme-switch.component'
import { CONTACT_EMAIL, contactMailto } from '../../core/contact'
import { AccountPendingService } from '../../core/services/account-pending.service'

@Component({
    selector: 'app-layout-footer',
    imports: [GithubMarkComponent, LogoComponent, RouterLink, ThemeSwitchComponent],
    templateUrl: './footer.component.html',
})
export class LayoutFooterComponent {
    /** The app's one quiet line once signed in, or while the account is confirmed (#259); the full footer otherwise. */
    public readonly showsAppFrame = inject(AccountPendingService).showsAppFrame
    public date = new Date().getFullYear().toString()
    protected readonly contactEmail = CONTACT_EMAIL
    protected readonly contactLink = contactMailto(
        $localize`:Subject of the email a reader starts from the contact link in the footer:Board Vault`,
    )
}
