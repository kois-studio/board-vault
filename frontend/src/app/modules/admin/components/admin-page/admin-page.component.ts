import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component'

@Component({
    imports: [AdminPageHeaderComponent, RouterLink, IconComponent],
    templateUrl: './admin-page.component.html',
})
export class AdminPageComponent {
    public readonly adminAreas = [
        {
            title: 'Proposals',
            description: 'Review submitted games and decide whether they belong in the shared catalogue.',
            route: '/admin/proposals',
            icon: 'file-text',
        },
        {
            title: 'Games',
            description: 'Search the catalogue and maintain game translations and tags.',
            route: '/admin/manage-games',
            icon: 'gamepad',
        },
        {
            title: 'Tags',
            description: 'Maintain tag categories and the tags used to organize games.',
            route: '/admin/manage-tags',
            icon: 'tag',
        },
    ]
}
