import { Component, computed, ElementRef, inject, input } from '@angular/core'
import { IconComponent } from '../icon/icon.component'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'accent'
export type ButtonSize = 'small' | 'medium' | 'large'

const ICON_SIZE: Record<ButtonSize, number> = { small: 16, medium: 18, large: 21 }

/**
 * The app's button look, applied to a native `<button>` or `<a>`. The element
 * stays native, so every attribute and directive (`routerLink`, `aria-*`,
 * `form`, `target`) works on it directly. Use `<button>` for actions and `<a>`
 * for navigation.
 *
 * @example
 * ```html
 * <button appButton (click)="save()">Save</button>
 * <button appButton variant="secondary" icon="plus">Add</button>
 * <button appButton variant="danger" [loading]="isDeleting()">Delete</button>
 * <button appButton type="submit" [disabled]="form.invalid">Submit</button>
 * <a appButton routerLink="/collection/browse" icon="plus">Add games</a>
 * ```
 */
@Component({
    selector: 'button[appButton], a[appButton]',
    templateUrl: './button.component.html',
    imports: [IconComponent],
    host: {
        '[class.app-btn-primary]': "variant() === 'primary'",
        '[class.app-btn-secondary]': "variant() === 'secondary'",
        '[class.app-btn-danger]': "variant() === 'danger'",
        '[class.app-btn-success]': "variant() === 'success'",
        '[class.app-btn-accent]': "variant() === 'accent'",
        '[class.app-btn-sm]': "size() === 'small'",
        '[class.app-btn-lg]': "size() === 'large'",
        '[class.w-full]': 'wide()',
        '[attr.type]': 'isButton ? type() : null',
        '[attr.disabled]': "isButton && (disabled() || loading()) ? '' : null",
        '[attr.aria-busy]': 'loading() || null',
        '[attr.aria-disabled]': '(!isButton && disabled()) || null',
        '[attr.tabindex]': '!isButton && disabled() ? -1 : null',
    },
})
export class ButtonComponent {
    readonly variant = input<ButtonVariant>('primary')
    readonly size = input<ButtonSize>('medium')
    /** Defaults to `button`, so a button inside a form never submits by accident. */
    readonly type = input<'button' | 'submit' | 'reset'>('button')
    /** Icon shown before the label. */
    readonly icon = input<string>()
    /** On a link, removes it from the tab order and blocks clicks. */
    readonly disabled = input(false)
    /** Shows a spinner and blocks clicks while an action runs. */
    readonly loading = input(false)
    /** Fills the width of its container. */
    readonly wide = input(false)

    protected readonly isButton = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON'
    protected readonly iconSize = computed(() => ICON_SIZE[this.size()])
}
