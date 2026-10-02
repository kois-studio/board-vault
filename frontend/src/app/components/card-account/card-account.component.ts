import { CommonModule } from '@angular/common'
import { Component, input } from '@angular/core'
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
    readonly member = input.required<null | PublicUserType>()
    readonly isOwner = input(false)
    readonly format = input<'default' | 'compact'>('default')
}
