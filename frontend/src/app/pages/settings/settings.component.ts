import { Component, computed, DOCUMENT, inject } from '@angular/core'
import { environment } from '../../../environments/environment'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { DataService } from '../../core/services/data.service'
import { LoginService } from '../../core/services/login.service'
import { PendingProposalsService } from '../../core/services/pending-proposals.service'
import { languageMenuLocales } from '../../layout/language-menu/language-menu.component'
import { SidebarGroup, SidebarLayoutComponent } from '../../layout/sidebar-layout/sidebar-layout.component'

/** The Settings sections; Language only when the page has languages to choose from (not on a development server). */
export function settingsSections(withLanguage: boolean): SidebarGroup {
    return {
        items: [
            { label: $localize`:Section of the Settings menu:Profile`, icon: 'user-circle', link: '/settings/profile' },
            { label: $localize`:Section of the Settings menu:Appearance`, icon: 'palette', link: '/settings/appearance' },
            ...(withLanguage
                ? [{ label: $localize`:Section of the Settings menu:Language`, icon: 'languages', link: '/settings/language' }]
                : []),
            { label: $localize`:Section of the Settings menu:Account`, icon: 'lock', link: '/settings/account' },
            { label: $localize`:Section of the Settings menu:Privacy`, icon: 'shield-lock', link: '/settings/privacy' },
        ],
    }
}

@Component({
    imports: [CardAccountComponent, SidebarLayoutComponent],
    templateUrl: './settings.component.html',
})
export class SettingsPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loginService = inject(LoginService)
    private readonly pendingProposals = inject(PendingProposalsService)
    private readonly sections = settingsSections(
        languageMenuLocales(inject(DOCUMENT).location.pathname, environment.previewLocales).length > 0,
    )

    public readonly currentUser$ = this.dataService.currentUser

    public readonly groups = computed<Array<SidebarGroup>>(() => {
        if (!this.loginService.isCurrentUserAdmin()) return [this.sections]

        // Administration stays in English (ADR-0024).
        return [
            this.sections,
            {
                label: 'Administration',
                items: [
                    { label: 'Overview', icon: 'layout-dashboard', link: '/admin/panel' },
                    {
                        label: 'Proposals',
                        icon: 'file-text',
                        link: '/admin/proposals',
                        badge: this.pendingProposals.count(),
                        badgeLabel: 'pending',
                    },
                    { label: 'Games', icon: 'gamepad', link: '/admin/manage-games' },
                    { label: 'Tags', icon: 'tag', link: '/admin/manage-tags' },
                    { label: 'Usage', icon: 'graph-up', link: '/admin/usage' },
                ],
            },
        ]
    })
}
