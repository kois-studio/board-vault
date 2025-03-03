import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'

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
    imports: [CommonModule],
})
export class ButtonComponent {
    @Input() variant: 'primary' | 'secondary' | 'danger' | 'success' = 'primary'
    @Input() size: 'small' | 'medium' | 'large' = 'medium'
    @Input() type: 'button' | 'submit' | 'reset' = 'button'
    @Input() icon?: string // The icon to display in the button
    @Input() disabled = false
    @Input() loading = false
    @Input() wide = false
}
