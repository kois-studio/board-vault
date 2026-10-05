import { Component, computed, inject } from '@angular/core'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { DataService } from '../../core/services/data.service'
import { LoginService } from '../../core/services/login.service'
import { PendingProposalsService } from '../../core/services/pending-proposals.service'
import { SidebarGroup, SidebarLayoutComponent } from '../../layout/sidebar-layout/sidebar-layout.component'

export const SETTINGS_SECTIONS: SidebarGroup = {
    items: [
        { label: 'Profile', icon: 'user-circle', link: '/settings/profile' },
        { label: 'Appearance', icon: 'palette', link: '/settings/appearance' },
        { label: 'Security', icon: 'shield-lock', link: '/settings/security' },
    ],
}

@Component({
    imports: [CardAccountComponent, SidebarLayoutComponent],
    templateUrl: './settings.component.html',
})
export class SettingsPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loginService = inject(LoginService)
    private readonly pendingProposals = inject(PendingProposalsService)

    public readonly currentUser$ = this.dataService.currentUser

    public readonly groups = computed<Array<SidebarGroup>>(() => {
        if (!this.loginService.isCurrentUserAdmin()) return [SETTINGS_SECTIONS]

        return [
            SETTINGS_SECTIONS,
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
                ],
            },
        ]
    })
}
