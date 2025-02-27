import { Component, Input } from '@angular/core'

@Component({
    imports: [],
    selector: 'title-subtitle',
    templateUrl: 'title-subtitle.component.html',
})
export class TitleSubtitleComponent {
    @Input({ required: true }) titleText = '' // cannot be "title" or it triggers HTML's one
    @Input() helpText?: string // Optional help text for the popup

    isHelpVisible = false

    toggleHelp(): void {
        this.isHelpVisible = !this.isHelpVisible
    }

    closeHelp(): void {
        this.isHelpVisible = false
    }
}
