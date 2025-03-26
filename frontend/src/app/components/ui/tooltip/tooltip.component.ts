import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'

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

    public showTooltip(): void {
        this.isVisible = true
    }

    public hideTooltip(): void {
        this.isVisible = false
    }
}
