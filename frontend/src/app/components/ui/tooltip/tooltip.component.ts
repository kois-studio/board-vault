import { CommonModule } from '@angular/common'
import { Component, HostListener, Input } from '@angular/core'

@Component({
    imports: [CommonModule],
    selector: 'app-tooltip',
    templateUrl: './tooltip.component.html',
})
export class TooltipComponent {
    @Input() text = ''
    @Input() position: 'top' | 'bottom' | 'left' | 'right' = 'top'

    // Component logic
    public isVisible = false
    public readonly tooltipId = `tooltip-${Math.random().toString(36).slice(2, 9)}`

    public showTooltip(): void {
        this.isVisible = true
    }

    public hideTooltip(): void {
        this.isVisible = false
    }

    @HostListener('focusin')
    public onFocusIn(): void {
        this.showTooltip()
    }

    @HostListener('focusout', ['$event'])
    public onFocusOut(event: FocusEvent): void {
        const nextTarget = event.relatedTarget as Node | null
        if (!nextTarget || !(event.currentTarget as HTMLElement).contains(nextTarget)) {
            this.hideTooltip()
        }
    }

    @HostListener('keydown.escape')
    public onEscape(): void {
        this.hideTooltip()
    }
}
