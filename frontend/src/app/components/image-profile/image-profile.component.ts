import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { UserType } from '../../api/api.types'

@Component({
    imports: [CommonModule],
    selector: 'app-image-profile',
    templateUrl: 'image-profile.component.html',
})
export class ImageProfileComponent {
    @Input({ required: true }) avatar: null | undefined | UserType['imageUrl'] = null
    @Input() size: 'small' | 'medium' | 'large' = 'medium'
}
