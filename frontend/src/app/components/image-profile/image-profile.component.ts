import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'

@Component({
    imports: [CommonModule],
    selector: 'app-image-profile',
    templateUrl: 'image-profile.component.html',
})
export class ImageProfileComponent {
    @Input() imageUrl: null | undefined | string = null
    @Input() size: 'small' | 'medium' | 'large' = 'medium'
}
