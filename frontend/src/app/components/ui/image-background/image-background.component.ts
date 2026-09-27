import { Component, Input, OnChanges, SimpleChanges } from '@angular/core'

@Component({
    imports: [],
    selector: 'image-background',
    templateUrl: 'image-background.component.html',
})
export class ImageBackgroundComponent implements OnChanges {
    @Input({ required: true }) src = ''
    @Input() alt = 'Game artwork'
    @Input() loading: 'eager' | 'lazy' = 'lazy'

    public hasError = false

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['src']) {
            this.hasError = false
        }
    }

    public handleImageError(): void {
        this.hasError = true
    }
}
