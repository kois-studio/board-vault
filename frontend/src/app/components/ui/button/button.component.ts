import { CommonModule } from '@angular/common'
import { Component, HostBinding, Input } from '@angular/core'
import { RouterLink } from '@angular/router'

/**
 * @description
 * A button component that can be used to create a button with a variety of variants and types.
 *
 * @example
 * ```html
 * <app-button>Click me</app-button>
 * <app-button variant="secondary">Secondary Action</app-button>
 * <app-button variant="danger">Delete</app-button>
 * <app-button variant="success">Confirm</app-button>
 * <app-button [loading]="true">Processing</app-button>
 * <app-button type="submit">Submit Form</app-button>
 * <app-button [disabled]="true">Unavailable</app-button>
 * ```
 */
@Component({
    selector: 'app-button',
    templateUrl: './button.component.html',
    imports: [CommonModule, RouterLink],
})
export class ButtonComponent {
    /**
     * RouterLink can add a tabindex to the host when routerLink is passed to
     * this component. The native button below is the only interactive control
     * that should appear in the keyboard order.
     */
    @HostBinding('attr.tabindex') public readonly hostTabIndex = '-1'

    @Input() variant: 'primary' | 'secondary' | 'danger' | 'success' = 'primary'
    @Input() size: 'small' | 'medium' | 'large' = 'medium'
    @Input() type: 'button' | 'submit' | 'reset' = 'button'
    @Input() icon?: string // The icon to display in the button
    @Input() disabled = false
    @Input() loading = false
    @Input() wide = false
    @Input() routerLink: string | Array<string | number> | null = null
}
