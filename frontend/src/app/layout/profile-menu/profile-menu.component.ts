import { Component, computed, ElementRef, inject, viewChild } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { GithubMarkComponent } from '../../components/ui/github-mark/github-mark.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ThemeSwitchComponent } from '../../components/ui/theme-switch/theme-switch.component'
import { intlLocale } from '../../core/i18n/format'
import { DataService } from '../../core/services/data.service'
import { LoginService } from '../../core/services/login.service'
import { PendingProposalsService } from '../../core/services/pending-proposals.service'
import { injectDisclosure } from '../../core/utils/disclosure'

/** The avatar menu: account, settings, theme, submissions, administration, about, sign out (disclosure pattern). */
@Component({
    imports: [GithubMarkComponent, ImageProfileComponent, IconComponent, RouterLink, ThemeSwitchComponent],
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

    /** Admins hear how many game proposals wait, which the dot on the avatar shows. */
    public readonly triggerLabel = computed(() => {
        const count = this.isAdmin() ? this.pendingProposalCount() : 0
        if (!count) return $localize`:Name of the avatar button in the header:Account menu`
        return new Intl.PluralRules(intlLocale()).select(count) === 'one'
            ? $localize`:account menu, one|Name of the avatar button in the header for an admin, with game proposals waiting for review, one:Account menu, ${count}:count: game proposal waiting`
            : $localize`:account menu, other|Name of the avatar button in the header for an admin, with game proposals waiting for review, more than one:Account menu, ${count}:count: game proposals waiting`
    })

    public async onClickSignOut(): Promise<void> {
        this.disclosure.close()
        await this.loginService.logOut()
        this.dataService.currentUser.set(null)
    }
}
