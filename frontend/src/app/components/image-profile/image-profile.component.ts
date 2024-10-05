import { Component, Input } from '@angular/core'

@Component({
    standalone: true,
    imports: [],
    selector: 'app-image-profile',
    templateUrl: 'image-profile.component.html',
})
export class ImageProfileComponent {
    @Input() imageUrl: null | undefined | string = null
}
