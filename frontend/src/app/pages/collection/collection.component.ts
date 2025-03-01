import { Component } from '@angular/core'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'

@Component({
    imports: [PageHeaderComponent, ButtonComponent],
    templateUrl: 'collection.component.html',
})
export class CollectionPageComponent {}
