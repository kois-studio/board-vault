import { Component, ElementRef, inject, viewChild } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ThemeSwitchComponent } from '../../components/ui/theme-switch/theme-switch.component'
import { DataService } from '../../core/services/data.service'
import { LoginService } from '../../core/services/login.service'
import { PendingProposalsService } from '../../core/services/pending-proposals.service'
import { injectDisclosure } from '../../core/utils/disclosure'

/** The avatar menu: account, settings, theme, submissions, administration, sign out (disclosure pattern). */
@Component({
    imports: [ImageProfileComponent, IconComponent, RouterLink, ThemeSwitchComponent],
    selector: 'app-profile-menu',
    templateUrl: 'profile-menu.component.html',
})
export class ProfileMenuComponent {
    private readonly loginService = inject(LoginService)
    private readonly dataService = inject(DataService)
    private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger')

    public readonly disclosure = injectDisclosure(() => this.trigger())

    public readonly currentUser$ = this.dataService.currentUser
    public readonly userProposalStats$ = this.dataService.userProposalStats
    public readonly isAdmin = this.loginService.isCurrentUserAdmin
    public readonly pendingProposalCount = inject(PendingProposalsService).count

    public async onClickSignOut(): Promise<void> {
        this.disclosure.close()
        await this.loginService.logOut()
        this.dataService.currentUser.set(null)
    }
}
