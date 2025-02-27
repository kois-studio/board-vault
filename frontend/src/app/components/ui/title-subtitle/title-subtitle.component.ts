import { Component, Input } from '@angular/core'

@Component({
    imports: [],
    selector: 'title-subtitle',
    templateUrl: 'title-subtitle.component.html',
})
export class TitleSubtitleComponent {
    @Input({ required: true }) titleText = '' // cannot be "title" or it triggers HTML's one
}
