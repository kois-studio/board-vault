import { CommonModule } from '@angular/common'
import { Component, inject, input, OnInit } from '@angular/core'
import { RouterModule } from '@angular/router'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { ThemeSwitchComponent } from '../../../../components/ui/theme-switch/theme-switch.component'
import { PendingProposalsService } from '../../../../core/services/pending-proposals.service'

@Component({
    selector: 'app-admin-sidebar',
    imports: [CommonModule, RouterModule, IconComponent, ThemeSwitchComponent],
    templateUrl: './admin-sidebar.component.html',
})
export class AdminSidebarComponent implements OnInit {
    readonly collapsed = input.required<boolean>()
    private readonly pendingProposals = inject(PendingProposalsService)
    public readonly pendingCount = this.pendingProposals.count

    ngOnInit(): void {
        void this.pendingProposals.refresh()
    }

    // --------------------------------------------------------------------------
    //        Sidebar Menu Items
    // --------------------------------------------------------------------------
    public readonly menuItems: Array<{
        label: string
        routerLink: string // URL
        icon: string // Lucide icon name or legacy alias
        exactMatch: boolean // needed for routerLinkActive
    }> = [
        {
            label: 'Panel',
            routerLink: 'panel',
            icon: 'grid',
            exactMatch: true,
        },
        {
            label: 'Game Proposals',
            routerLink: 'proposals',
            icon: 'file-earmark-plus',
            exactMatch: false,
        },
        {
            label: 'Manage Games',
            routerLink: 'manage-games',
            icon: 'puzzle',
            exactMatch: false,
        },
        {
            label: 'Manage Tags',
            routerLink: 'manage-tags',
            icon: 'tags',
            exactMatch: false,
        },
    ]
}
