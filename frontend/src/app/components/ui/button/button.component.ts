import { NgTemplateOutlet } from '@angular/common'
import { Component, computed, input } from '@angular/core'
import { type Params, RouterLink } from '@angular/router'
import { IconComponent } from '../icon/icon.component'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success'
export type ButtonSize = 'small' | 'medium' | 'large'

const SIZE_CLASS: Record<ButtonSize, string> = { small: 'app-btn-sm', medium: '', large: 'app-btn-lg' }
const ICON_SIZE: Record<ButtonSize, number> = { small: 16, medium: 18, large: 21 }

/**
 * The app's button. It renders a native `<button>`, or a link when `link` is
 * set, so navigation stays a real link (new tab, copy address). Its look comes
 * from the shared `app-btn-*` classes in `styles.css`, which links styled as
 * buttons use too.
 *
 * @example
 * ```html
 * <app-button (click)="save()">Save</app-button>
 * <app-button variant="secondary" icon="plus">Add</app-button>
 * <app-button variant="danger" [loading]="isDeleting()">Delete</app-button>
 * <app-button type="submit" [disabled]="form.invalid">Submit</app-button>
 * <app-button link="/collection/browse" icon="plus">Add games</app-button>
 * ```
 */
@Component({
    selector: 'app-button',
    templateUrl: './button.component.html',
    imports: [NgTemplateOutlet, RouterLink, IconComponent],
    host: { class: 'inline-flex', '[class.w-full]': 'wide()' },
})
export class ButtonComponent {
    readonly variant = input<ButtonVariant>('primary')
    readonly size = input<ButtonSize>('medium')
    readonly type = input<'button' | 'submit' | 'reset'>('button')
    /** Icon shown before the label. */
    readonly icon = input<string>()
    readonly disabled = input(false)
    /** Shows a spinner and blocks clicks while an action runs. */
    readonly loading = input(false)
    /** Fills the width of its container. */
    readonly wide = input(false)
    /** Renders a link to this route instead of a button. */
    readonly link = input<string | Array<string | number> | null>(null)
    readonly queryParams = input<Params | null>(null)

    public readonly classes = computed(() =>
        [`app-btn-${this.variant()}`, SIZE_CLASS[this.size()], this.wide() ? 'w-full' : ''].filter(Boolean).join(' '),
    )
    public readonly iconSize = computed(() => ICON_SIZE[this.size()])
}
