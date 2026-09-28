import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { UserType } from '../../api/api.types'
import { IconComponent } from '../ui/icon/icon.component'

@Component({
    imports: [CommonModule, IconComponent],
    selector: 'app-image-profile',
    templateUrl: 'image-profile.component.html',
})
export class ImageProfileComponent {
    @Input({ required: true }) avatar: null | undefined | UserType['avatar'] = null
    @Input() size: 'base' | 'large' = 'base'
}
