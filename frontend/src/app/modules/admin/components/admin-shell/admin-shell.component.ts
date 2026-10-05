import { Component, computed, inject } from '@angular/core'
import { PendingProposalsService } from '../../../../core/services/pending-proposals.service'
import { SidebarGroup, SidebarLayoutComponent } from '../../../../layout/sidebar-layout/sidebar-layout.component'

/** Administration inside the app layout: the same sidebar shell as Settings. */
@Component({
    selector: 'app-admin-shell',
    imports: [SidebarLayoutComponent],
    template: '<app-sidebar-layout title="Administration" basePath="/admin" [groups]="groups()" />',
})
export class AdminShellComponent {
    private readonly pendingProposals = inject(PendingProposalsService)

    public readonly groups = computed<Array<SidebarGroup>>(() => [
        {
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
    ])
}
