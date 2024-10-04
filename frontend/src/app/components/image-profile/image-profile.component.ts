import { Component, Input } from '@angular/core'

@Component({
    standalone: true,
    imports: [],
    selector: 'app-image-profile',
    templateUrl: 'image-profile.component.html',
})
export class ImageProfileComponent {
    @Input({ required: true }) imageUrl: null | undefined | string = null

    public defaultImageUrl = 'https://pbs.twimg.com/profile_images/1833050358479826944/A2qj0e6Z_400x400.jpg'
}
