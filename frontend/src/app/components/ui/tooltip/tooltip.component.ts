import { CommonModule } from '@angular/common'
import { Component, HostListener, input } from '@angular/core'

@Component({
    imports: [CommonModule],
    selector: 'app-tooltip',
    templateUrl: './tooltip.component.html',
})
export class TooltipComponent {
    readonly text = input('')
    readonly position = input<'top' | 'bottom' | 'left' | 'right'>(
        'top',
        // Component logic
    )

    // Component logic
    public isVisible = false
    public readonly tooltipId = `tooltip-${Math.random().toString(36).slice(2, 9)}`

    public showTooltip(): void {
        this.isVisible = true
    }

    public hideTooltip(): void {
        this.isVisible = false
    }

    @HostListener('focusin', ['$event'])
    public onFocusIn(event: FocusEvent): void {
        const target = event.target
        if (target instanceof HTMLElement) target.setAttribute('aria-describedby', this.tooltipId)
        this.showTooltip()
    }

    @HostListener('focusout', ['$event'])
    public onFocusOut(event: FocusEvent): void {
        const nextTarget = event.relatedTarget as Node | null
        if (!nextTarget || !(event.currentTarget as HTMLElement).contains(nextTarget)) {
            const target = event.target
            if (target instanceof HTMLElement) target.removeAttribute('aria-describedby')
            this.hideTooltip()
        }
    }

    @HostListener('keydown.escape')
    public onEscape(): void {
        this.hideTooltip()
    }
}
