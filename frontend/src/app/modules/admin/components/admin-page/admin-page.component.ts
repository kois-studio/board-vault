import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { IconComponent } from '../../../../components/ui/icon/icon.component'

@Component({
    imports: [RouterLink, IconComponent],
    templateUrl: './admin-page.component.html',
})
export class AdminPageComponent {
    public readonly adminAreas = [
        {
            title: 'Game proposals',
            description: 'Review submitted games and decide whether they belong in the shared catalogue.',
            route: '/admin/proposals',
            icon: 'file-earmark-plus',
        },
        {
            title: 'Manage games',
            description: 'Search the catalogue and maintain game translations and tags.',
            route: '/admin/manage-games',
            icon: 'puzzle',
        },
        {
            title: 'Manage tags',
            description: 'Maintain tag categories and the tags used to organize games.',
            route: '/admin/manage-tags',
            icon: 'tags',
        },
    ]
}
