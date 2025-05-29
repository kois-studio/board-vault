import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { RouterModule } from '@angular/router'

@Component({
    selector: 'app-admin-sidebar',
    imports: [CommonModule, RouterModule],
    templateUrl: './admin-sidebar.component.html',
})
export class AdminSidebarComponent {
    @Input({ required: true }) collapsed = false

    // --------------------------------------------------------------------------
    //        Sidebar Menu Items
    // --------------------------------------------------------------------------
    public readonly menuItems: Array<{
        label: string
        routerLink: string // URL
        icon: string // Bootstrap icon name
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
