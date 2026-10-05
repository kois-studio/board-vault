import { Component, input } from '@angular/core'

/**
 * The Board Vault mark: four pieces around a shared square. It is drawn in
 * `currentColor`, so the colour comes from a `text-bv-*` class on the element.
 * Decorative by default; pass `label` when the mark stands alone.
 */
@Component({
    selector: 'app-logo',
    host: { class: 'inline-flex shrink-0' },
    template: `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            fill="currentColor"
            [attr.width]="size()"
            [attr.height]="size()"
            [attr.role]="label() ? 'img' : null"
            [attr.aria-label]="label() || null"
            [attr.aria-hidden]="label() ? null : 'true'"
        >
            <rect x="9" y="9" width="28" height="16" rx="3" />
            <rect x="39" y="9" width="16" height="28" rx="3" />
            <rect x="27" y="39" width="28" height="16" rx="3" />
            <rect x="9" y="27" width="16" height="28" rx="3" />
        </svg>
    `,
})
export class LogoComponent {
    public readonly size = input(32)
    public readonly label = input('')
}
