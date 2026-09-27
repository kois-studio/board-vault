import { Component, HostListener, Input } from '@angular/core'
import { IconComponent } from '../icon/icon.component'

@Component({
    imports: [IconComponent],
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

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.closeHelp()
    }
}
