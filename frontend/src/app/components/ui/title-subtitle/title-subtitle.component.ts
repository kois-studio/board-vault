import { Component, HostListener, input } from '@angular/core'
import { IconComponent } from '../icon/icon.component'

@Component({
    imports: [IconComponent],
    selector: 'title-subtitle',
    templateUrl: 'title-subtitle.component.html',
})
export class TitleSubtitleComponent {
    // Not "title": that would also set the host's native title attribute.
    readonly titleText = input.required<string>()
    /** Optional help text for the popup. */
    readonly helpText = input<string>()

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
