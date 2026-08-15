import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { PublicUserType } from '../../api/api.types'
import { ImageProfileComponent } from '../image-profile/image-profile.component'

@Component({
    imports: [CommonModule, ImageProfileComponent],
    selector: 'app-card-account',
    templateUrl: 'card-account.component.html',
})
export class CardAccountComponent {
    // --------------------------------------------------------------------------
    //        IN / OUT
    // --------------------------------------------------------------------------
    @Input({ required: true }) member: null | PublicUserType = null
    @Input({ required: false }) isOwner = false
    @Input({ required: false }) format: 'default' | 'compact' = 'default'
}
