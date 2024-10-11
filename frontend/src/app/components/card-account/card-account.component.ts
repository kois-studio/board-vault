import { Component, Input } from '@angular/core'
import { UserType } from '../../api/api.types'
import { ImageProfileComponent } from '../image-profile/image-profile.component'

@Component({
    standalone: true,
    imports: [ImageProfileComponent],
    selector: 'app-card-account',
    templateUrl: 'card-account.component.html',
})
export class CardAccountComponent {
    @Input({ required: true }) member: null | UserType = null
    @Input() isOwner = false
}
