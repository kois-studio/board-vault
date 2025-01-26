import { Component, Input } from '@angular/core'

@Component({
    standalone: true,
    imports: [],
    selector: 'title-subtitle',
    templateUrl: 'title-subtitle.component.html',
})
export class TitleSubtitleComponent {
    @Input({ required: true }) title = ''
}
