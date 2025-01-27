import { Component, Input } from '@angular/core'

@Component({
    standalone: true,
    imports: [],
    selector: 'image-background',
    templateUrl: 'image-background.component.html',
})
export class ImageBackgroundComponent {
    @Input({ required: true }) src!: string
}
